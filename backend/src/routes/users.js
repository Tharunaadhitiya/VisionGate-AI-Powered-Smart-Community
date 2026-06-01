const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, isActive } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = { deletedAt: null, isActive: true };
    if (req.user.role !== 'admin') {
      filter.isActive = true;
    } else if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (role) filter.role = role;

    let userList = await User.find(filter, { sort: { createdAt: -1 }, skip, limit: pageLimit });
    if (req.user.role !== 'admin') {
      userList = userList.map(({ password, ...rest }) => rest);
    }

    const total = await User.countDocuments(filter);

    res.json({ success: true, data: { users: userList, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) } });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.userId.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.userId.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const allowedFields = ['name', 'phone', 'flatNumber', 'tower', 'preferences', 'profileImage'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ success: true, message: 'Profile updated', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

router.post('/:id/request-reactivation', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.reactivationRequested = true;
    user.reactivationReason = req.body.reason || 'User requested reactivation';
    await User.save(user);
    const io = req.app.get('io');
    if (io) {
      io.to('role:admin').emit('reactivation:notification', { message: `${user.name} (${user.email}) is requesting account reactivation`, userId: user._id, name: user.name, email: user.email });
    }
    res.json({ success: true, message: 'Reactivation request sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to request reactivation' });
  }
});

router.put('/:id/toggle-active', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await User.save(user);
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle user status' });
  }
});

router.post('/', authenticate, authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['resident', 'security', 'admin']),
  body('tower').trim().notEmpty().withMessage('Tower is required'),
  body('flatNumber').trim().notEmpty().withMessage('Flat number is required'),
], validate, async (req, res) => {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });

    const data = { ...req.body, houseCode: `${req.body.tower}-${req.body.flatNumber}` };
    const user = await User.create(data);
    res.status(201).json({ success: true, message: 'User created', data: { user } });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    if (req.userId.toString() === req.params.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false, deletedAt: new Date() }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deactivated', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

router.get('/reactivation-requests', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ reactivationRequested: true, deletedAt: { $ne: null } })
    users._reactivationFilter = true;
    const filtered = [];
    for (const u of users) {
      if (u.deletedAt) filtered.push(u);
    }
    const result = filtered.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    res.json({ success: true, data: { users: result } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

router.put('/:id/reactivate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true, deletedAt: null, reactivationRequested: false, reactivationReason: undefined },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${user._id}`).emit('notification:received', { type: 'reactivation', title: 'Account Reactivated', message: 'Your account has been reactivated by an administrator', severity: 'success' });
    }
    res.json({ success: true, message: 'User reactivated', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reactivate user' });
  }
});

router.put('/:id/reject-reactivation', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { reactivationRequested: false, reactivationReason: undefined },
      { new: true }
    );
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${user._id}`).emit('notification:received', { type: 'reactivation', title: 'Reactivation Denied', message: 'Your reactivation request has been denied', severity: 'error' });
    }
    res.json({ success: true, message: 'Reactivation request rejected', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject reactivation' });
  }
});

router.put('/:id/password', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.userId.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized request' });
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const user = await User.findOne({ _id: req.params.id }, { select: '+password' });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const isMatch = await require('bcryptjs').compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(newPassword, 12);
    await require('../models/dbHelpers').db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    require('../utils/logger').error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server connection failed' });
  }
});

router.get('/analytics/resident-stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 }, active: { $sum: { $cond: { if: { $gte: ['$isActive', true] }, then: 1, else: 0 } } } } },
    ]);
    const total = await User.countDocuments();
    const towers = await User.distinct('tower');
    res.json({ success: true, data: { stats, total, towers } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

router.put('/:id/promote-admin', authenticate, authorize('admin'), async (req, res) => {
  try {
    if (req.userId.toString() === req.params.id) {
      return res.status(400).json({ success: false, message: 'Cannot promote yourself' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    logger.info(`Promote-admin check: userId=${req.params.id}, role="${user.role}"`);

    const normalizedRole = (user.role || '').toLowerCase().trim();
    if (normalizedRole !== 'resident') {
      return res.status(400).json({ success: false, message: 'Only residents can be promoted to admin' });
    }

    const updated = await User.findByIdAndUpdate(req.params.id, { role: 'admin' }, { new: true });

    const Alert = require('../models/Alert');
    const UserNotification = require('../models/UserNotification');
    const alert = await Alert.create({
      type: 'system',
      severity: 'high',
      title: 'Role Updated',
      message: `You have been promoted to Administrator by ${req.user.name}.`,
      createdBy: req.userId,
      broadcastTo: [],
    });

    await UserNotification.create({ userId: parseInt(req.params.id), alertId: alert._id, read: false, deleted: false });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.params.id}`).emit('notification:received', {
        type: 'role_update',
        title: 'Role Updated',
        message: `You have been promoted to Administrator by ${req.user.name}.`,
        severity: 'high',
        userNotificationId: alert._id,
      });
    }

    res.json({ success: true, message: 'User promoted to admin', data: { user: updated } });
  } catch (error) {
    logger.error('Promote admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to promote user' });
  }
});

module.exports = router;
