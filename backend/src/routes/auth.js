const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: config.jwtExpire });
};

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['resident', 'security', 'admin']),
  body('tower').trim().notEmpty().withMessage('Tower is required'),
  body('flatNumber').trim().notEmpty().withMessage('Flat number is required'),
], validate, async (req, res) => {
  try {
    const { name, email, phone, password, role, tower, flatNumber } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const houseCode = `${tower}-${flatNumber}`;
    const user = await User.create({ name, email, phone, password, role: role || 'resident', tower, flatNumber, houseCode });
    const token = generateToken(user._id);

    logger.info(`Resident Registered Successfully\nTower: ${tower}\nFlat Number: ${flatNumber}\nHouse Code: ${houseCode}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token },
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }, { select: '+password' });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.deletedAt) {
      if (!user.reactivationRequested) {
        user.reactivationRequested = true;
        user.reactivationReason = 'User attempted login after deletion';
        const saved = await User.save(user);
        const io = req.app.get('io');
        if (io) {
          io.to('role:admin').emit('reactivation:notification', { message: `${user.name} (${user.email}) is requesting account reactivation`, userId: user._id, name: user.name, email: user.email });
        }
      }
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. An administrator has been notified and will review your reactivation request.' });
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    delete user.password;
    user.lastLogin = new Date();
    await User.save(user);

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: { user, token },
    });
  } catch (error) {
    logger.error('Login error:', error.code, error.message);
    console.error('Login error details:', { code: error.code, sqlMessage: error.sqlMessage, sqlState: error.sqlState });
    res.status(500).json({ success: false, message: `Login failed (${error.code || 'unknown'})` });
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    req.user.lastLogin = new Date();
    await User.save(req.user);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

module.exports = router;
