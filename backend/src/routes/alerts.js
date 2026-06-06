const express = require('express');
const { body } = require('express-validator');
const Alert = require('../models/Alert');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const UserNotification = require('../models/UserNotification');
const logger = require('../utils/logger');
const { notifyUser, notifyAllAdmins, notifyAllSecurity, notifyRole } = require('../services/notificationHelper');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, severity } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};

    if (req.user.role !== 'admin') {
      filter.$or = [
        { targetUsers: req.userId },
        { broadcastTo: 'all' },
        { broadcastTo: req.user.role === 'resident' ? 'residents' : req.user.role },
      ];
    }
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    const [alerts, total] = await Promise.all([
      Alert.find(filter, { sort: { createdAt: -1 }, skip, limit: pageLimit, populate: true }),
      Alert.countDocuments(filter),
    ]);

    res.json({ success: true, data: { alerts, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) } });
  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
  }
});

router.post('/', authenticate, [
  body('type').isIn(['suspicious_activity', 'unauthorized_access', 'emergency_sos', 'fire_smoke', 'weapon_detected', 'intrusion', 'loitering', 'crowd_density', 'general']),
  body('title').trim().notEmpty(),
  body('message').trim().notEmpty(),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('target').optional().isIn(['all', 'residents', 'security', 'admin']),
], validate, async (req, res) => {
  try {
    const { target, ...alertBody } = req.body;
    if (req.user.role === 'resident' && ['emergency_sos', 'unauthorized_access', 'weapon_detected', 'intrusion', 'suspicious_activity'].includes(req.body.type)) {
      return res.status(403).json({ success: false, message: 'Residents cannot create high-security alerts. Use the SOS button for emergencies.' });
    }
    const alertData = {
      ...alertBody,
      createdBy: req.userId,
      broadcastTo: target ? [target] : ['all'],
    };
    const alert = await Alert.create(alertData);
    const populated = await Alert.findById(alert._id);
    const sender = populated.createdBy ? { name: populated.createdBy.name, role: populated.createdBy.role } : null;
    const payload = { type: 'alert', sender, ...populated };
    const io = req.app.get('io');
    if (io) {
      io.emit('alert:received', payload);
    }

    const targets = alertData.broadcastTo || ['all'];
    if (targets.includes('all') || targets.includes('admin')) {
      await notifyAllAdmins(io, { type: 'alert', title: alertData.title, body: alertData.message, data: { severity: alertData.severity || 'medium', alertId: alert._id?.toString() } });
    }
    if (targets.includes('all') || targets.includes('security')) {
      await notifyAllSecurity(io, { type: 'alert', title: alertData.title, body: alertData.message, data: { severity: alertData.severity || 'medium', alertId: alert._id?.toString() } });
    }
    if (targets.includes('all') || targets.includes('residents')) {
      await notifyRole(io, 'resident', { type: 'alert', title: alertData.title, body: alertData.message, data: { severity: alertData.severity || 'medium', alertId: alert._id?.toString() } });
    }
    if (alertData.targetUsers) {
      for (const uid of alertData.targetUsers) {
        await notifyUser(io, uid, { type: 'alert', title: alertData.title, body: alertData.message, data: { severity: alertData.severity || 'medium', alertId: alert._id?.toString() } });
      }
    }
    res.status(201).json({ success: true, message: 'Alert created', data: { alert: populated, sender } });
  } catch (error) {
    logger.error('Create alert error:', error);
    res.status(500).json({ success: false, message: 'Failed to create alert' });
  }
});

router.put('/:id/acknowledge', authenticate, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: 'acknowledged', acknowledgedBy: req.userId, acknowledgedAt: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.json({ success: true, message: 'Alert acknowledged', data: { alert } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to acknowledge alert' });
  }
});

router.put('/:id/resolve', authenticate, authorize('security', 'admin'), async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', resolvedBy: req.userId, resolvedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, message: 'Alert resolved', data: { alert } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to resolve alert' });
  }
});

router.post('/sos', authenticate, async (req, res) => {
  try {
    const alert = await Alert.create({
      type: 'emergency_sos',
      severity: 'critical',
      title: 'SOS Emergency Alert',
      message: `Emergency SOS from ${req.user.name} - Flat ${req.user.flatNumber}, Tower ${req.user.tower}`,
      isEmergency: true,
      broadcastTo: ['all', 'security', 'admin'],
      targetUsers: [req.userId],
      location: req.body.location,
      createdBy: req.userId,
      metadata: { userName: req.user.name, flatNumber: req.user.flatNumber, tower: req.user.tower },
    });

    const populated = await Alert.findById(alert._id);
    const sender = { name: req.user.name, role: req.user.role };
    const payload = { type: 'alert', severity: 'critical', title: 'SOS Emergency', message: `${req.user.name} needs help!`, from: req.user.name, flat: req.user.flatNumber, tower: req.user.tower, userId: req.userId, sender, ...populated };
    const io = req.app.get('io');
    if (io) {
      io.to('role:security').emit('sos:emergency', payload);
      io.to('role:admin').emit('sos:emergency', payload);
      io.emit('alert:received', payload);
    }
    await notifyAllSecurity(io, { type: 'emergency_sos', title: 'SOS Emergency!', body: `${req.user.name} needs help! Flat ${req.user.flatNumber}, Tower ${req.user.tower}`, data: { severity: 'critical', alertId: alert._id?.toString(), userId: req.userId } });
    await notifyAllAdmins(io, { type: 'emergency_sos', title: 'SOS Emergency!', body: `${req.user.name} needs help! Flat ${req.user.flatNumber}, Tower ${req.user.tower}`, data: { severity: 'critical', alertId: alert._id?.toString(), userId: req.userId } });

    res.status(201).json({ success: true, message: 'SOS alert sent', data: { alert: populated } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send SOS' });
  }
});

router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const stats = await Alert.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 }, critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } } } },
    ]);
    const total = await Alert.countDocuments();
    res.json({ success: true, data: { stats, total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

module.exports = router;
