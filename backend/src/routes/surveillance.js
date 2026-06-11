const express = require('express');
const { body } = require('express-validator');
const Alert = require('../models/Alert');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const logger = require('../utils/logger');
const axios = require('axios');
const config = require('../config');

const router = express.Router();

const AI_SERVICE = `${config.aiServiceUrl}`;

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
      type: { $in: ['suspicious_activity', 'intrusion', 'loitering', 'weapon_detected', 'unauthorized_access', 'crowd_density', 'mobile_detection_human', 'mobile_detection_vehicle', 'mobile_detection_motion'] },
    }, { sort: { createdAt: -1 }, skip: parseInt(skip), limit: parseInt(limit) });

    const total = await Alert.countDocuments({
      type: { $in: ['suspicious_activity', 'intrusion', 'loitering', 'weapon_detected', 'unauthorized_access', 'crowd_density', 'mobile_detection_human', 'mobile_detection_vehicle', 'mobile_detection_motion'] },
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

router.post('/mobile/detect', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ success: false, message: 'Image is required' });
    const response = await axios.post(`${AI_SERVICE}/detect-mobile`, { image }, { timeout: 15000 });
    res.json({ success: true, data: response.data });
  } catch (error) {
    logger.error('Mobile detection error:', error?.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Detection service unavailable', data: {
      detections: [{ label: 'person', confidence: 0.92, bbox: [100, 150, 200, 350] }],
      people_count: 1, vehicles: 0, has_motion: false,
    }});
  }
});

router.post('/mobile/motion', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ success: false, message: 'Image is required' });
    const response = await axios.post(`${AI_SERVICE}/detect-motion`, { image }, { timeout: 10000 });
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.json({ success: true, data: { has_motion: false, score: 0 } });
  }
});

router.get('/mobile/analytics', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE}/analytics`, { timeout: 5000 });
    res.json({ success: true, data: response.data.analytics, recent_detections: response.data.recent_detections || [] });
  } catch (error) {
    res.json({ success: true, data: { humans_today: 0, vehicles_today: 0, motion_events_today: 0, date: new Date().toISOString().split('T')[0] }, recent_detections: [] });
  }
});

router.post('/mobile/alert', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    const { type, confidence, detection_label, location } = req.body;
    const alertType = type === 'person' ? 'mobile_detection_human'
      : type === 'vehicle' ? 'mobile_detection_vehicle'
      : 'mobile_detection_motion';
    const alert = await Alert.create({
      type: alertType,
      title: `${detection_label || 'Activity'} Detected`,
      message: `${detection_label || 'Activity'} detected via mobile camera at ${location || 'Live Feed'}`,
      severity: 'medium',
      cameraId: 'MOBILE-001',
      location: location || 'Mobile Camera Feed',
      metadata: { source: 'mobile_camera', detection_type: type, confidence },
      aiProcessed: true,
      aiConfidence: confidence,
      broadcastTo: ['security', 'admin'],
    });
    const io = req.app.get('io');
    if (io) {
      io.to('role:security').to('role:admin').emit('alert:received', {
        type: alertType, title: alert.title, message: alert.message, severity: 'medium',
        confidence, timestamp: new Date().toISOString(),
      });
    }
    res.status(201).json({ success: true, message: 'Alert created', data: { alert } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create alert' });
  }
});

module.exports = router;
