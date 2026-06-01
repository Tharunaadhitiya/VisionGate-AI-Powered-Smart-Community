const express = require('express');
const { body } = require('express-validator');
const Incident = require('../models/Incident');
const User = require('../models/User');
const UserNotification = require('../models/UserNotification');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const logger = require('../utils/logger');

const router = express.Router();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

function validateMediaFormat(mediaUrl, mediaType) {
  if (!mediaUrl) return null;
  if (!mediaUrl.startsWith('data:')) return 'Invalid file format';
  const mimeMatch = mediaUrl.match(/^data:([^;]+);/);
  if (!mimeMatch) return 'Invalid file format';
  const mime = mimeMatch[1].toLowerCase();
  if (mediaType === 'video') {
    if (!ALLOWED_VIDEO_TYPES.includes(mime)) return 'Invalid video format. Allowed: MP4, MOV';
  } else {
    if (!ALLOWED_IMAGE_TYPES.includes(mime)) return 'Invalid image format. Allowed: JPG, JPEG, PNG, WEBP';
  }
  const sizeBytes = Math.round((mediaUrl.length * 3) / 4);
  if (mediaType === 'video' && sizeBytes > MAX_VIDEO_SIZE) return 'Video exceeds maximum size limit (50 MB)';
  if (mediaType !== 'video' && sizeBytes > MAX_IMAGE_SIZE) return 'Image exceeds maximum size limit (10 MB)';
  return null;
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};
    if (req.user.role === 'resident') filter.reportedBy = req.userId;
    if (status) filter.status = status;
    if (category) filter.category = category;

    const [incidents, total] = await Promise.all([
      Incident.find(filter, { sort: { createdAt: -1 }, skip, limit: pageLimit, populate: true }),
      Incident.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { incidents, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) },
    });
  } catch (error) {
    logger.error('Get incidents error:', error);
    res.status(500).json({ success: false, message: 'Database connection error' });
  }
});

router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('Please fill all required fields — title is required'),
  body('description').trim().notEmpty().withMessage('Please fill all required fields — description is required'),
  body('location').optional().trim(),
  body('mediaUrl').optional(),
  body('mediaType').optional().isIn(['image', 'video']),
], validate, async (req, res) => {
  try {
    const { title, description, location, mediaUrl, mediaType } = req.body;

    if (mediaUrl) {
      const formatErr = validateMediaFormat(mediaUrl, mediaType || 'image');
      if (formatErr) {
        return res.status(400).json({ success: false, message: formatErr });
      }
    }

    let incident = await Incident.create({
      title,
      description,
      location: location || '',
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || 'image',
      category: 'other',
      reportedBy: req.userId,
    });

    const aiService = require('../services/aiService');
    try {
      const analysis = await aiService.classifyComplaint({
        title,
        description,
        category: 'other',
      });
      if (analysis && analysis.category) {
        incident = await Incident.findByIdAndUpdate(incident._id, {
          aiCategory: analysis.category,
          aiPriority: analysis.priority || 'medium',
          aiSummary: analysis.summary,
          status: 'ai_analyzed',
        }, { new: true });
      } else {
        incident = await Incident.findByIdAndUpdate(incident._id, {
          aiCategory: 'Pending Review',
          aiPriority: 'medium',
          aiSummary: 'Awaiting manual review',
          status: 'ai_analyzed',
        }, { new: true });
      }
    } catch (aiErr) {
      logger.warn('AI analysis service unavailable, using fallback:', aiErr.message);
      incident = await Incident.findByIdAndUpdate(incident._id, {
        aiCategory: 'Pending Review',
        aiPriority: 'medium',
        aiSummary: 'AI service unavailable — pending manual review',
        status: 'ai_analyzed',
      }, { new: true });
    }

    const reporter = await User.findById(req.userId);
    const io = req.app.get('io');
    try {
      const admins = await User.find({ role: 'admin', isActive: true, deletedAt: null });
      for (const admin of admins) {
        await UserNotification.create({
          userId: admin._id,
          alertId: null,
          read: false,
          deleted: false,
        });
        if (io) {
          io.to(`user:${admin._id}`).emit('notification:received', {
            type: 'incident',
            title: 'New Incident Reported',
            message: `A new incident has been reported and requires review. Reporter: ${reporter?.name || 'Unknown'}, Type: ${incident.aiCategory || incident.category || 'Uncategorized'}, Priority: ${incident.aiPriority || 'Medium'}`,
            severity: incident.aiPriority === 'critical' || incident.aiPriority === 'high' ? 'critical' : 'info',
            incidentId: incident._id,
          });
        }
      }
    } catch (notifErr) {
      logger.warn('Admin notification error:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Incident reported successfully',
      data: {
        incident,
        aiCategory: incident.aiCategory || 'Pending Review',
        aiPriority: incident.aiPriority || 'medium',
      },
    });
  } catch (error) {
    logger.error('Create incident error:', error);
    if (error.code === 'ER_DATA_TOO_LONG' || (error.message && error.message.includes('Data too long'))) {
      return res.status(400).json({ success: false, message: 'File upload failed — file too large' });
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || (error.message && error.message.includes('foreign key'))) {
      return res.status(400).json({ success: false, message: 'Unauthorized request — invalid user reference' });
    }
    if (error.code === 'ECONNREFUSED' || (error.message && error.message.includes('connect'))) {
      return res.status(500).json({ success: false, message: 'Database connection error' });
    }
    res.status(500).json({ success: false, message: 'Server error occurred' });
  }
});

router.put('/:id/status', authenticate, authorize('admin'), [
  body('status').isIn(['submitted', 'under_review', 'assigned', 'resolved', 'dismissed']),
  body('resolution').optional().trim(),
], validate, async (req, res) => {
  try {
    const update = { status: req.body.status };
    if (req.body.status === 'resolved') {
      update.resolvedAt = new Date();
      update.resolution = req.body.resolution;
    }
    const incident = await Incident.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });
    res.json({ success: true, message: 'Incident updated', data: { incident } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error occurred' });
  }
});

router.put('/:id/assign', authenticate, authorize('admin'), [
  body('assignedTo').isInt(),
], validate, async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, { assignedTo: req.body.assignedTo, status: 'assigned' }, { new: true });
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });
    res.json({ success: true, message: 'Incident assigned', data: { incident } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error occurred' });
  }
});

module.exports = router;
