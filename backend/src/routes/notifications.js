const express = require('express');
const { body } = require('express-validator');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { dispatchNotification } = require('../utils/notificationDispatch');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/send', authenticate, [
  body('title').trim().notEmpty(),
  body('message').trim().notEmpty(),
  body('type').isIn(['emergency', 'announcement', 'reminder', 'warning']),
  body('target').isIn(['all', 'residents', 'security', 'admin', 'individuals']),
  body('targetUsers').optional().isArray(),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
], validate, async (req, res) => {
  try {
    const { title, message, type, target, targetUsers, severity } = req.body;

    if (req.user.role === 'resident' && ['emergency'].includes(type)) {
      return res.status(403).json({ success: false, message: 'Residents cannot send emergency notifications. Use the SOS button instead.' });
    }

    const alertData = {
      type: type === 'emergency' ? 'emergency_sos' : 'general',
      severity: severity || (type === 'emergency' ? 'high' : 'medium'),
      title,
      message,
      isEmergency: type === 'emergency',
      createdBy: req.userId,
    };

    if (target === 'individuals' && targetUsers?.length) {
      alertData.targetUsers = targetUsers;
    } else {
      alertData.broadcastTo = target === 'all' ? ['all'] : [target];
    }

    const alert = await Alert.create(alertData);

    const populated = await Alert.findById(alert._id);

    let sender = null;
    if (populated.createdBy) {
      const senderUser = await User.findById(populated.createdBy);
      if (senderUser) sender = { name: senderUser.name, role: senderUser.role };
    }
    const payload = { type: 'alert', sender, ...populated, createdBy: undefined, broadcastTo: undefined, targetUsers: undefined };

    const io = req.app.get('io');
    dispatchNotification({
      alertId: alert._id,
      target,
      targetUsers,
      broadcastTo: alertData.broadcastTo,
      io,
      eventName: 'notification:received',
      payload,
    });

    res.status(201).json({ success: true, message: 'Notification sent', data: { alert: populated } });
  } catch (error) {
    logger.error('Send notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
});

router.get('/target-users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, search } = req.query;
    const filter = { deletedAt: null };
    if (role) filter.role = role;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const users = await User.find(filter, { limit: 50 });
    const mapped = users.map(({ password, ...u }) => u);
    res.json({ success: true, data: { users: mapped } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

module.exports = router;
