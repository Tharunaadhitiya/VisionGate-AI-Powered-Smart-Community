const express = require('express');
const { body } = require('express-validator');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const User = require('../models/User');
const Alert = require('../models/Alert');
const UserNotification = require('../models/UserNotification');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const logger = require('../utils/logger');
const { notifyUser } = require('../services/notificationHelper');

const router = express.Router();

function calculateMatchScore(lost, found) {
  let score = 0;
  const lName = (lost.itemName || '').toLowerCase();
  const fName = (found.itemName || '').toLowerCase();
  const lDesc = (lost.description || '').toLowerCase();
  const fDesc = (found.description || '').toLowerCase();
  const lColor = (lost.color || '').toLowerCase();
  const fColor = (found.color || '').toLowerCase();
  const lBrand = (lost.brand || '').toLowerCase();
  const fBrand = (found.brand || '').toLowerCase();

  const lWords = new Set([...lName.split(/\s+/), ...lDesc.split(/\s+/)]);
  const fWords = new Set([...fName.split(/\s+/), ...fDesc.split(/\s+/)]);
  let commonWords = 0;
  for (const w of lWords) { if (w.length > 2 && fWords.has(w)) commonWords++; }
  score += Math.min(commonWords * 15, 50);

  if (lName.includes(fName) || fName.includes(lName)) score += 15;
  if (lColor && fColor && lColor === fColor) score += 15;
  if (lBrand && fBrand && lBrand === fBrand) score += 10;

  const lKeyTerms = ['wallet', 'phone', 'keys', 'bag', 'laptop', 'watch', 'glasses', 'umbrella', 'id', 'card', 'purse', 'backpack', 'headphones', 'bottle', 'charger'];
  for (const term of lKeyTerms) {
    if ((lName.includes(term) || lDesc.includes(term)) && (fName.includes(term) || fDesc.includes(term))) {
      score += 10;
      break;
    }
  }

  return Math.min(score, 100);
}

async function notifyMatch(io, chatId, matchData, type) {
  try {
    const alert = await Alert.create({
      userId: chatId,
      type: 'general',
      title: 'Potential Lost & Found Match Detected',
      message: `A ${type} item matching your report has been found. Match Score: ${matchData.score}%. Please review.`,
      severity: 'info',
    });
    await UserNotification.create({
      userId: chatId,
      alertId: alert._id,
      read: false,
      deleted: false,
    });
    await notifyUser(io, chatId, { type: 'lost_found_match', title: 'Potential Lost & Found Match Detected', body: `A ${type} item matching your report has been found. Match Score: ${matchData.score}%.`, data: { severity: 'info', alertId: alert._id?.toString(), matchScore: matchData.score } });
  } catch (e) { logger.warn('Match notification error:', e.message); }
}

router.get('/lost', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};
    if (req.user.role === 'resident') filter.reportedBy = req.userId;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      LostItem.find(filter, { sort: { createdAt: -1 }, skip, limit: pageLimit, populate: true }),
      LostItem.countDocuments(filter),
    ]);

    res.json({ success: true, data: { items, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) } });
  } catch (error) {
    logger.error('Get lost items error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch lost items' });
  }
});

router.get('/found', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};
    if (req.user.role === 'resident') filter.reportedBy = req.userId;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      FoundItem.find(filter, { sort: { createdAt: -1 }, skip, limit: pageLimit, populate: true }),
      FoundItem.countDocuments(filter),
    ]);

    res.json({ success: true, data: { items, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) } });
  } catch (error) {
    logger.error('Get found items error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch found items' });
  }
});

router.post('/lost', authenticate, [
  body('itemName').trim().notEmpty().withMessage('Item name is required'),
  body('description').optional().trim(),
  body('location').optional().trim(),
  body('dateLost').optional().isISO8601(),
  body('imageUrl').optional().trim(),
  body('color').optional().trim(),
  body('brand').optional().trim(),
], validate, async (req, res) => {
  try {
    const item = await LostItem.create({
      ...req.body,
      status: 'open',
      reportedBy: req.userId,
    });

    const io = req.app.get('io');
    const openFoundItems = await FoundItem.find({ status: 'open' }, { populate: true });
    for (const found of openFoundItems) {
      const score = calculateMatchScore(item, found);
      if (score >= 60) {
        await LostItem.findByIdAndUpdate(item._id, { matchedItemId: found._id, matchScore: score, status: 'matched' });
        await FoundItem.findByIdAndUpdate(found._id, { matchedItemId: item._id, matchScore: score, status: 'matched' });
        notifyMatch(io, found.reportedBy?._id || found.reportedBy, { score }, 'found');
        notifyMatch(io, item.reportedBy, { score }, 'lost');
        break;
      }
    }

    const populated = await LostItem.findById(item._id);
    res.status(201).json({ success: true, message: 'Lost item reported', data: { item: populated } });
  } catch (error) {
    logger.error('Create lost item error:', error);
    res.status(500).json({ success: false, message: 'Failed to report lost item' });
  }
});

router.post('/found', authenticate, [
  body('itemName').trim().notEmpty().withMessage('Item name is required'),
  body('description').optional().trim(),
  body('foundLocation').optional().trim(),
  body('imageUrl').optional().trim(),
  body('color').optional().trim(),
  body('brand').optional().trim(),
], validate, async (req, res) => {
  try {
    const item = await FoundItem.create({
      ...req.body,
      status: 'open',
      reportedBy: req.userId,
    });

    const io = req.app.get('io');
    const openLostItems = await LostItem.find({ status: 'open' }, { populate: true });
    for (const lost of openLostItems) {
      const score = calculateMatchScore(lost, item);
      if (score >= 60) {
        await FoundItem.findByIdAndUpdate(item._id, { matchedItemId: lost._id, matchScore: score, status: 'matched' });
        await LostItem.findByIdAndUpdate(lost._id, { matchedItemId: item._id, matchScore: score, status: 'matched' });
        notifyMatch(io, lost.reportedBy?._id || lost.reportedBy, { score }, 'lost');
        notifyMatch(io, item.reportedBy, { score }, 'found');
        break;
      }
    }

    const populated = await FoundItem.findById(item._id);
    res.status(201).json({ success: true, message: 'Found item reported', data: { item: populated } });
  } catch (error) {
    logger.error('Create found item error:', error);
    res.status(500).json({ success: false, message: 'Failed to report found item' });
  }
});

router.put('/lost/:id/close', authenticate, authorize('admin'), async (req, res) => {
  try {
    const updated = await LostItem.findByIdAndUpdate(req.params.id, { status: 'closed', resolvedAt: new Date() }, { populate: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, message: 'Case closed', data: { item: updated } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to close case' });
  }
});

router.put('/found/:id/return', authenticate, authorize('admin'), async (req, res) => {
  try {
    const updated = await FoundItem.findByIdAndUpdate(req.params.id, { status: 'returned', returnedAt: new Date() }, { populate: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, message: 'Item marked as returned', data: { item: updated } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update item' });
  }
});

router.get('/matches', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [lost, found] = await Promise.all([
      LostItem.find({ status: 'matched' }, { populate: true }),
      FoundItem.find({ status: 'matched' }, { populate: true }),
    ]);
    res.json({ success: true, data: { lostItems: lost, foundItems: found } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch matches' });
  }
});

module.exports = router;
