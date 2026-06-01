const express = require('express');
const { body } = require('express-validator');
const Complaint = require('../models/Complaint');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};

    if (req.user.role === 'resident') filter.residentId = req.userId;
    if (status) filter.status = status;
    if (category) filter.category = category;

    const [complaints, total] = await Promise.all([
      Complaint.find(filter, { sort: { createdAt: -1 }, skip, limit: pageLimit, populate: true }),
      Complaint.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { complaints, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) },
    });
  } catch (error) {
    logger.error('Get complaints error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
});

router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').isIn(['plumbing', 'electrical', 'cleaning', 'noise', 'security', 'parking', 'pest_control', 'structural', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('location').optional().trim(),
], validate, async (req, res) => {
  try {
    let complaint = await Complaint.create({ ...req.body, residentId: req.userId });

    const aiService = require('../services/aiService');
    try {
      const analysis = await aiService.classifyComplaint({ title: req.body.title, description: req.body.description, category: req.body.category });
      if (analysis && analysis.category) {
        complaint = await Complaint.findByIdAndUpdate(complaint._id, {
          aiCategory: analysis.category,
          aiSuggestedDepartment: analysis.department,
          aiSummary: analysis.summary,
          aiPriority: analysis.priority || req.body.priority,
        }, { new: true });
      }
    } catch (aiErr) {
      logger.warn('AI classification failed, continuing:', aiErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: { complaint },
    });
  } catch (error) {
    logger.error('Create complaint error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit complaint' });
  }
});

router.put('/:id/status', authenticate, authorize('admin'), [
  body('status').isIn(['in_progress', 'resolved', 'rejected', 'closed']),
], validate, async (req, res) => {
  try {
    const update = { status: req.body.status };
    if (req.body.status === 'resolved') {
      update.resolvedAt = new Date();
      update.resolvedBy = req.userId;
      update.resolution = req.body.resolution;
    }
    if (req.body.assignedTo) update.assignedTo = req.body.assignedTo;

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    res.json({ success: true, message: 'Complaint updated', data: { complaint } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update complaint' });
  }
});

router.post('/:id/feedback', authenticate, [
  body('feedback').isInt({ min: 1, max: 5 }),
], validate, async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { feedback: req.body.feedback, feedbackComment: req.body.comment },
      { new: true }
    );
    res.json({ success: true, message: 'Feedback submitted', data: { complaint } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
});

router.get('/analytics/summary', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [total, byCategory, byStatus, avgResolutionTime] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.aggregate([{ $match: {} }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $match: {} }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([
        { $match: { resolvedAt: { $exists: true }, createdAt: { $exists: true } } },
        { $project: { diff: { $subtract: ['$resolvedAt', '$createdAt'] } } },
        { $group: { _id: null, avgTime: { $avg: '$diff' } } },
      ]),
    ]);

    res.json({ success: true, data: { total, byCategory, byStatus, avgResolutionTime: avgResolutionTime[0]?.avgTime || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

router.put('/:id/ai-override', authenticate, authorize('admin'), [
  body('aiCategory').optional(),
  body('aiPriority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('aiSuggestedDepartment').optional(),
  body('aiSummary').optional(),
], validate, async (req, res) => {
  try {
    const updates = {};
    if (req.body.aiCategory) updates.aiCategory = req.body.aiCategory;
    if (req.body.aiPriority) updates.aiPriority = req.body.aiPriority;
    if (req.body.aiSuggestedDepartment) updates.aiSuggestedDepartment = req.body.aiSuggestedDepartment;
    if (req.body.aiSummary) updates.aiSummary = req.body.aiSummary;

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    res.json({ success: true, message: 'AI analysis updated', data: { complaint } });
  } catch (error) {
    logger.error('AI override error:', error);
    res.status(500).json({ success: false, message: 'Failed to update AI analysis' });
  }
});

module.exports = router;
