const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const pushService = require('../services/pushService');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/vapid-public-key', (req, res) => {
  const { publicKey } = require('../config/pushKeys');
  res.json({ success: true, data: { publicKey } });
});

router.post('/subscribe', authenticate, [
  body('endpoint').isString().notEmpty(),
  body('keys.p256dh').isString().notEmpty(),
  body('keys.auth').isString().notEmpty(),
], validate, async (req, res) => {
  try {
    const sub = await pushService.subscribe(
      req.userId,
      { endpoint: req.body.endpoint, keys: req.body.keys },
      req.body.deviceName || null
    );
    res.json({ success: true, message: 'Subscribed to push notifications', data: { subscription: sub } });
  } catch (error) {
    logger.error('Push subscribe error:', error);
    res.status(500).json({ success: false, message: 'Failed to subscribe' });
  }
});

router.post('/unsubscribe', authenticate, [
  body('endpoint').isString().notEmpty(),
], validate, async (req, res) => {
  try {
    await pushService.unsubscribe(req.userId, req.body.endpoint);
    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    logger.error('Push unsubscribe error:', error);
    res.status(500).json({ success: false, message: 'Failed to unsubscribe' });
  }
});

router.get('/subscriptions', authenticate, async (req, res) => {
  try {
    const subs = await pushService.getSubscriptions(req.userId);
    res.json({ success: true, data: { subscriptions: subs } });
  } catch (error) {
    logger.error('Get subscriptions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
  }
});

router.post('/test', authenticate, async (req, res) => {
  try {
    const result = await pushService.sendPush(
      req.userId,
      'VisionGate Test Notification',
      'This is a test push notification from VisionGate.',
      { url: '/', type: 'test' }
    );
    res.json({ success: true, message: `Push sent: ${result.sent} succeeded, ${result.failed} failed`, data: result });
  } catch (error) {
    logger.error('Test push error:', error);
    res.status(500).json({ success: false, message: 'Failed to send test notification' });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const { rows, total } = await pushService.getNotificationHistory(req.userId, limit, offset);
    res.json({ success: true, data: { history: rows, total } });
  } catch (error) {
    logger.error('Get notification history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

router.get('/preferences', authenticate, async (req, res) => {
  try {
    const prefs = await pushService.getNotificationPreferences(req.userId);
    res.json({ success: true, data: { preferences: prefs } });
  } catch (error) {
    logger.error('Get preferences error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch preferences' });
  }
});

router.put('/preferences', authenticate, [
  body('visitorRequests').optional().isBoolean(),
  body('visitorApprovals').optional().isBoolean(),
  body('maintenanceReminders').optional().isBoolean(),
  body('packageArrivals').optional().isBoolean(),
  body('emergencyAlerts').optional().isBoolean(),
  body('pollsAndVoting').optional().isBoolean(),
  body('lostAndFound').optional().isBoolean(),
  body('passwordRecovery').optional().isBoolean(),
], validate, async (req, res) => {
  try {
    const prefs = await pushService.updateNotificationPreferences(req.userId, req.body);
    res.json({ success: true, message: 'Preferences updated', data: { preferences: prefs } });
  } catch (error) {
    logger.error('Update preferences error:', error);
    res.status(500).json({ success: false, message: 'Failed to update preferences' });
  }
});

router.post('/send', authenticate, authorize('admin'), [
  body('userId').isString().notEmpty(),
  body('title').isString().notEmpty(),
  body('body').isString().notEmpty(),
], validate, async (req, res) => {
  try {
    const result = await pushService.sendPush(
      req.body.userId,
      req.body.title,
      req.body.body,
      { url: req.body.url || '/', type: req.body.type || 'admin' }
    );
    res.json({ success: true, message: `Push sent: ${result.sent} succeeded`, data: result });
  } catch (error) {
    logger.error('Admin send push error:', error);
    res.status(500).json({ success: false, message: 'Failed to send push notification' });
  }
});

router.post('/broadcast', authenticate, authorize('admin'), [
  body('title').isString().notEmpty(),
  body('body').isString().notEmpty(),
], validate, async (req, res) => {
  try {
    const result = await pushService.sendPushToAll(
      req.body.title,
      req.body.body,
      { url: req.body.url || '/', type: req.body.type || 'broadcast' }
    );
    res.json({ success: true, message: `Broadcast sent to ${result.sent} devices`, data: result });
  } catch (error) {
    logger.error('Broadcast push error:', error);
    res.status(500).json({ success: false, message: 'Failed to broadcast' });
  }
});

module.exports = router;
