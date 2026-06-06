const express = require('express');
const { body } = require('express-validator');
const RecoveryRequest = require('../models/RecoveryRequest');
const User = require('../models/User');
const Alert = require('../models/Alert');
const UserNotification = require('../models/UserNotification');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/recovery-requests — public, no auth
router.post('/', [
  body('userName').optional().trim().notEmpty().withMessage('Please enter your name.'),
  body('name').optional().trim().notEmpty().withMessage('Please enter your name.'),
  body('email').isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
  body('phone').optional().trim().notEmpty().withMessage('Please enter your phone number.'),
  body('phoneNumber').optional().trim().notEmpty().withMessage('Please enter your phone number.'),
  body('reason').trim().notEmpty().withMessage('Please provide a reason for recovery.'),
], validate, async (req, res) => {
  try {
    const userName = req.body.userName || req.body.name || '';
    const email = req.body.email || '';
    const phoneNumber = req.body.phone || req.body.phoneNumber || '';
    const reason = req.body.reason || '';

    if (!userName.trim()) return res.status(400).json({ success: false, message: 'Please enter your name.' });
    if (!email.trim()) return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    if (!phoneNumber.trim()) return res.status(400).json({ success: false, message: 'Please enter your phone number.' });
    if (!reason.trim()) return res.status(400).json({ success: false, message: 'Please provide a reason for recovery.' });

    const request = await RecoveryRequest.create({
      userName,
      email,
      phoneNumber,
      reason,
      status: 'Pending',
    });

    const admins = await User.find({ role: 'admin', isActive: true });
    const io = req.app.get('io');
    for (const admin of admins) {
      try {
        const alert = await Alert.create({
          type: 'general',
          severity: 'high',
          title: 'New Account Recovery Request',
          message: `A user has requested account recovery assistance.\n\nName: ${userName}\nEmail: ${email}\nPhone: ${phoneNumber}`,
          createdBy: admin._id,
          broadcastTo: [],
        });
        await UserNotification.create({ userId: admin._id, alertId: alert._id, read: false, deleted: false });
        if (io) io.to(`user:${admin._id}`).emit('notification:received', { type: 'account_recovery', title: 'New Account Recovery Request' });
      } catch (notifErr) {
        logger.error('Failed to notify admin ' + admin._id + ':', notifErr.message);
      }
    }

    logger.info(`Recovery request created by ${userName} (${email}) — ID: ${request._id}`);
    res.status(201).json({ success: true, message: 'Recovery request submitted successfully. An administrator will contact you shortly.', data: { request } });
  } catch (error) {
    logger.error('Recovery request error:', error);
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_CON_COUNT_ERROR') {
      return res.status(503).json({ success: false, message: 'Database connection failed. Please try again later.' });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A recovery request for this email already exists.' });
    }
    if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || error.code === 'ER_WARN_DATA_OUT_OF_RANGE') {
      return res.status(500).json({ success: false, message: 'Invalid data format.' });
    }
    if (error.code?.startsWith('ER_PARSE')) {
      return res.status(400).json({ success: false, message: 'Invalid request data.' });
    }
    res.status(500).json({ success: false, message: 'Server unavailable. Please try again later.' });
  }
});

// GET /api/recovery-requests — admin only
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await RecoveryRequest.find(filter, { sort: { createdAt: -1 } });

    const resolved = [];
    for (const r of requests) {
      const item = { ...r };
      if (item.handledBy) {
        const admin = await User.findById(item.handledBy);
        item.handledByName = admin?.name || null;
      }
      resolved.push(item);
    }

    res.json({ success: true, data: { requests: resolved } });
  } catch (error) {
    logger.error('Get recovery requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// PUT /api/recovery-requests/:id — admin only
router.put('/:id', authenticate, authorize('admin'), [
  body('status').isIn(['Resolved', 'Rejected', 'Approved']).withMessage('Status must be Resolved, Approved, or Rejected'),
  body('adminNote').optional().trim(),
], validate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const request = await RecoveryRequest.findByIdAndUpdate(id, {
      status,
      adminNote: adminNote || null,
      handledBy: req.userId,
      handledAt: new Date(),
    });

    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const user = await User.findOne({ email: request.email });
    if (user) {
      try {
        const alert = await Alert.create({
          type: 'general',
          severity: 'high',
          title: `Recovery Request ${status}`,
          message: status === 'Resolved' || status === 'Approved'
            ? 'Your account recovery request has been approved. An administrator will contact you with your new credentials.'
            : `Your account recovery request has been rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`,
          createdBy: req.userId,
          broadcastTo: [],
        });
        await UserNotification.create({ userId: user._id, alertId: alert._id, read: false, deleted: false });
        const io = req.app.get('io');
        if (io) io.to(`user:${user._id}`).emit('notification:received', { type: 'account_recovery', title: `Recovery Request ${status}` });
      } catch (notifErr) {
        logger.error('Failed to notify user ' + user._id + ':', notifErr.message);
      }
    }

    logger.info(`Recovery request #${id} ${status} by admin #${req.userId}`);
    res.json({ success: true, message: `Request ${status.toLowerCase()}`, data: { request } });
  } catch (error) {
    logger.error('Update recovery request error:', error);
    if (error.message?.includes('not found')) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }
    res.status(500).json({ success: false, message: 'Server unavailable. Please try again later.' });
  }
});

module.exports = router;
