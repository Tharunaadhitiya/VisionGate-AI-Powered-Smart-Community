const express = require('express');
const { body } = require('express-validator');
const Notice = require('../models/Notice');
const User = require('../models/User');
const UserNotification = require('../models/UserNotification');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, priority } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const now = new Date();
    const [notices, total] = await Promise.all([
      Notice.find(filter, { sort: { priority: -1, publishDate: -1 }, skip, limit: pageLimit, populate: true }),
      Notice.countDocuments(filter),
    ]);

    const active = notices.filter((n) => !n.expiryDate || new Date(n.expiryDate) > now);

    res.json({
      success: true,
      data: { notices: active, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) },
    });
  } catch (error) {
    logger.error('Get notices error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notices' });
  }
});

router.post('/', authenticate, authorize('admin'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').optional().isIn(['general', 'maintenance', 'security', 'events', 'emergency']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'emergency']),
  body('expiryDate').optional(),
], validate, async (req, res) => {
  try {
    const notice = await Notice.create({ ...req.body, createdBy: req.userId });

    const io = req.app.get('io');
    if (io) {
      const allUsers = await User.find({ isActive: true, deletedAt: null });
      for (const u of allUsers) {
        io.to(`user:${u._id}`).emit('notification:received', {
          type: 'notice',
          title: req.body.priority === 'emergency' ? '🚨 Emergency Notice' : 'New Notice',
          message: `${req.body.title} — ${req.body.description.substring(0, 100)}`,
          severity: req.body.priority === 'emergency' ? 'critical' : 'info',
          userNotificationId: notice._id,
        });
      }
    }

    res.status(201).json({ success: true, message: 'Notice published', data: { notice } });
  } catch (error) {
    logger.error('Create notice error:', error);
    res.status(500).json({ success: false, message: 'Failed to publish notice' });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });
    res.json({ success: true, message: 'Notice updated', data: { notice } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notice' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await Notice.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Notice removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove notice' });
  }
});

module.exports = router;
