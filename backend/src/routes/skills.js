const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const logger = require('../utils/logger');

const router = express.Router();

function parseUserSkills(user) {
  if (!user) return user;
  if (user.skills && typeof user.skills === 'string') {
    try { user.skills = JSON.parse(user.skills); } catch { user.skills = []; }
  }
  return user;
}

router.get('/professionals', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, data: { professionals: [] } });
    }

    const users = await User.searchByProfession(q.trim());
    const professionals = users.map(parseUserSkills);
    res.json({ success: true, data: { professionals } });
  } catch (error) {
    logger.error('Search professionals error:', error);
    res.status(500).json({ success: false, message: 'Failed to search professionals' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, profession } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = { role: 'resident' };
    if (profession) filter.profession = profession;
    if (req.user.role !== 'admin') filter.skill_visibility = { $in: ['public', 'community_only'] };

    const [users, total] = await Promise.all([
      User.find(filter, { sort: { name: 1 }, skip, limit: pageLimit }),
      User.countDocuments(filter),
    ]);

    const professionals = users.map(parseUserSkills);
    res.json({ success: true, data: { professionals, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) } });
  } catch (error) {
    logger.error('Get professionals error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch professionals' });
  }
});

router.put('/profile', authenticate, [
  body('profession').optional().trim(),
  body('skills').optional().isArray(),
  body('experience_years').optional().trim(),
  body('availability').optional().trim(),
  body('skill_visibility').optional().isIn(['public', 'community_only', 'private']),
], validate, async (req, res) => {
  try {
    const updates = {};
    if (req.body.profession !== undefined) updates.profession = req.body.profession;
    if (req.body.skills !== undefined) updates.skills = req.body.skills;
    if (req.body.experience_years !== undefined) updates.experience_years = req.body.experience_years;
    if (req.body.availability !== undefined) updates.availability = req.body.availability;
    if (req.body.skill_visibility !== undefined) updates.skill_visibility = req.body.skill_visibility;

    const updated = await User.findByIdAndUpdate(req.userId, updates);
    const result = parseUserSkills(updated);
    res.json({ success: true, message: 'Professional profile updated', data: { user: result } });
  } catch (error) {
    logger.error('Update professional profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update professional profile' });
  }
});

router.get('/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const categories = await User.getProfessionAnalytics();
    const total = categories.reduce((sum, r) => sum + r.count, 0);

    res.json({
      success: true,
      data: {
        totalProfessionals: total,
        categories: categories.map(r => ({ _id: r._id, count: r.count })),
      },
    });
  } catch (error) {
    logger.error('Profession analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

module.exports = router;
