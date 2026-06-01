const express = require('express');
const { body } = require('express-validator');
const Alert = require('../models/Alert');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/cameras', authenticate, authorize('admin', 'security'), async (req, res) => {
  const cameras = [
    { id: 'CAM-001', name: 'Main Gate', location: 'Main Entrance', status: 'active', rtspUrl: 'rtsp://camera1.local/stream', type: 'gate' },
    { id: 'CAM-002', name: 'Parking Lot', location: 'Underground Parking', status: 'active', rtspUrl: 'rtsp://camera2.local/stream', type: 'parking' },
    { id: 'CAM-003', name: 'Clubhouse', location: 'Clubhouse Entrance', status: 'active', rtspUrl: 'rtsp://camera3.local/stream', type: 'facility' },
    { id: 'CAM-004', name: 'Tower A Lobby', location: 'Tower A - Ground Floor', status: 'active', rtspUrl: 'rtsp://camera4.local/stream', type: 'lobby' },
    { id: 'CAM-005', name: 'Tower B Lobby', location: 'Tower B - Ground Floor', status: 'active', rtspUrl: 'rtsp://camera5.local/stream', type: 'lobby' },
    { id: 'CAM-006', name: 'Swimming Pool', location: 'Pool Area', status: 'inactive', rtspUrl: 'rtsp://camera6.local/stream', type: 'facility' },
    { id: 'CAM-007', name: 'Back Gate', location: 'Service Entrance', status: 'active', rtspUrl: 'rtsp://camera7.local/stream', type: 'gate' },
    { id: 'CAM-008', name: 'Garden', location: 'Community Garden', status: 'active', rtspUrl: 'rtsp://camera8.local/stream', type: 'outdoor' },
  ];
  res.json({ success: true, data: { cameras } });
});

router.get('/events', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const { db } = require('../models/dbHelpers');

    const events = await Alert.find({
      type: { $in: ['suspicious_activity', 'intrusion', 'loitering', 'weapon_detected', 'unauthorized_access', 'crowd_density'] },
    }, { sort: { createdAt: -1 }, skip: parseInt(skip), limit: parseInt(limit) });

    const total = await Alert.countDocuments({
      type: { $in: ['suspicious_activity', 'intrusion', 'loitering', 'weapon_detected', 'unauthorized_access', 'crowd_density'] },
    });

    res.json({ success: true, data: { events, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get surveillance events error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
});

router.post('/ai-alert', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    const { type, title, message, severity, cameraId, location, metadata, confidence } = req.body;
    const alert = await Alert.create({
      type, title, message, severity, cameraId, location, metadata,
      aiProcessed: true, aiConfidence: confidence,
      broadcastTo: ['security', 'admin'],
    });
    res.status(201).json({ success: true, message: 'AI alert registered', data: { alert } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create AI alert' });
  }
});

module.exports = router;
