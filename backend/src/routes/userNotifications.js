const express = require('express');
const UserNotification = require('../models/UserNotification');
const Alert = require('../models/Alert');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const notifs = await UserNotification.find({ userId: req.userId, deleted: false }, {
      sort: { createdAt: -1 },
      skip: parseInt(skip),
      limit: parseInt(limit),
    });

    const mapped = [];
    for (const n of notifs) {
      if (!n.alertId) continue;
      const alert = await Alert.findById(n.alertId);
      if (!alert) continue;
      mapped.push({
        userNotificationId: n._id,
        read: n.read,
        readAt: n.readAt,
        createdAt: n.createdAt,
        ...alert,
        _id: n._id,
        sender: alert.createdBy
          ? { name: alert.createdBy.name, role: alert.createdBy.role }
          : null,
      });
    }

    res.json({ success: true, data: { notifications: mapped } });
  } catch (error) {
    logger.error('Get user notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const count = await UserNotification.countDocuments({ userId: req.userId, read: false, deleted: false });
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notif = await UserNotification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: { notification: notif } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

router.put('/:id/unread', authenticate, async (req, res) => {
  try {
    const notif = await UserNotification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { read: false, $unset: { readAt: '' } },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: { notification: notif } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark as unread' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notif = await UserNotification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, deleted: false },
      { deleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
});

router.post('/clear-all', authenticate, async (req, res) => {
  try {
    await UserNotification.updateMany(
      { userId: req.userId, deleted: false },
      { deleted: true, deletedAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clear notifications' });
  }
});

module.exports = router;
