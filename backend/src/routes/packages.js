const express = require('express');
const { body } = require('express-validator');
const Package = require('../models/Package');
const User = require('../models/User');
const Alert = require('../models/Alert');
const UserNotification = require('../models/UserNotification');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const logger = require('../utils/logger');
const { notifyUser } = require('../services/notificationHelper');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, tower } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};
    if (req.user.role === 'resident') filter.residentId = req.userId;
    if (status) filter.status = status;
    if (tower) filter.tower = tower;

    const [packages, total] = await Promise.all([
      Package.find(filter, { sort: { createdAt: -1 }, skip, limit: pageLimit, populate: true }),
      Package.countDocuments(filter),
    ]);

    res.json({ success: true, data: { packages, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) } });
  } catch (error) {
    logger.error('Get packages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch packages' });
  }
});

router.post('/', authenticate, authorize('security'), [
  body('courier').trim().notEmpty().withMessage('Courier company is required'),
  body('packageType').trim().notEmpty().withMessage('Package type is required'),
  body('residentName').trim().notEmpty().withMessage('Resident name is required'),
  body('tower').trim().notEmpty().withMessage('Tower is required'),
  body('flatNumber').trim().notEmpty().withMessage('Flat number is required'),
  body('trackingNumber').optional().trim(),
  body('remarks').optional().trim(),
], validate, async (req, res) => {
  try {
    const { courier, packageType, residentName, tower, flatNumber, trackingNumber, remarks } = req.body;

    const residents = await User.find({ role: 'resident', flatNumber, tower });
    const resident = residents.length > 0 ? residents[0] : null;

    const pkg = await Package.create({
      courier, packageType, residentName, tower, flatNumber,
      trackingNumber: trackingNumber || '',
      remarks: remarks || '',
      status: 'received',
      residentId: resident ? resident._id : null,
    });

    const populated = await Package.findById(pkg._id);

    if (resident) {
      try {
        const alert = await Alert.create({
          userId: resident._id,
          type: 'general',
          title: 'New Package Received',
          message: `Courier: ${courier}, Package Type: ${packageType}, Received At: ${new Date().toLocaleString()}. Collect from Security Desk.`,
          severity: 'info',
        });
        await UserNotification.create({
          userId: resident._id,
          alertId: alert._id,
          read: false,
          deleted: false,
        });
      } catch (notifErr) {
        logger.warn('Package notification error:', notifErr.message);
      }

      const io = req.app.get('io');
      await notifyUser(io, resident._id, {
        type: 'package_received',
        title: 'New Package Received',
        body: `Courier: ${courier}, Package Type: ${packageType}. Collect from Security Desk.`,
        data: { severity: 'info', packageId: pkg._id?.toString() },
      });
    }

    res.status(201).json({ success: true, message: 'Package recorded successfully', data: { package: populated } });
  } catch (error) {
    logger.error('Create package error:', error);
    res.status(500).json({ success: false, message: 'Failed to record package' });
  }
});

router.put('/:id/collect', authenticate, authorize('security'), async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    if (pkg.status === 'collected') return res.status(400).json({ success: false, message: 'Package already collected' });

    const updated = await Package.findByIdAndUpdate(pkg._id, {
      status: 'collected',
      collectedAt: new Date(),
      collectedBy: req.userId,
    }, { populate: true });

    res.json({ success: true, message: 'Package marked as collected', data: { package: updated } });
  } catch (error) {
    logger.error('Collect package error:', error);
    res.status(500).json({ success: false, message: 'Failed to update package' });
  }
});

router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { db } = require('../models/dbHelpers');
    const todayStr = 'CURDATE()';
    const [receivedToday] = await db.query(`SELECT COUNT(*) AS count FROM packages WHERE DATE(createdAt) = ${todayStr}`);
    const [pendingPickups] = await db.query("SELECT COUNT(*) AS count FROM packages WHERE status IN ('received','ready')");
    const [delivered] = await db.query("SELECT COUNT(*) AS count FROM packages WHERE status = 'collected'");
    const [byCourier] = await db.query("SELECT courier AS _id, COUNT(*) AS count FROM packages GROUP BY courier ORDER BY count DESC LIMIT 10");

    res.json({
      success: true,
      data: {
        receivedToday: receivedToday[0]?.count || 0,
        pendingPickups: pendingPickups[0]?.count || 0,
        delivered: delivered[0]?.count || 0,
        byCourier: byCourier.map(r => ({ _id: r._id, count: r.count })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

module.exports = router;
