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
const { notifyUser, notifyAllAdmins, notifyAllSecurity } = require('../services/notificationHelper');

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
  const lLoc = (lost.location || '').toLowerCase();
  const fLoc = (found.foundLocation || '').toLowerCase();

  const lWords = new Set([...lName.split(/\s+/), ...lDesc.split(/\s+/)]);
  const fWords = new Set([...fName.split(/\s+/), ...fDesc.split(/\s+/)]);
  let commonWords = 0;
  for (const w of lWords) { if (w.length > 2 && fWords.has(w)) commonWords++; }
  score += Math.min(commonWords * 15, 50);

  if (lName.includes(fName) || fName.includes(lName)) score += 15;
  if (lColor && fColor && lColor === fColor) score += 15;
  if (lBrand && fBrand && lBrand === fBrand) score += 10;
  if (lLoc && fLoc && (lLoc.includes(fLoc) || fLoc.includes(lLoc))) score += 5;

  const lKeyTerms = ['wallet', 'phone', 'keys', 'bag', 'laptop', 'watch', 'glasses', 'umbrella', 'id', 'card', 'purse', 'backpack', 'headphones', 'bottle', 'charger'];
  for (const term of lKeyTerms) {
    if ((lName.includes(term) || lDesc.includes(term)) && (fName.includes(term) || fDesc.includes(term))) {
      score += 10;
      break;
    }
  }

  return Math.min(score, 100);
}

async function runMatching(io, newItem, type) {
  try {
    if (type === 'lost') {
      const openFound = await FoundItem.find({ status: 'open' }, { populate: true });
      for (const found of openFound) {
        const score = calculateMatchScore(newItem, found);
        if (score >= 60) {
          await LostItem.findByIdAndUpdate(newItem._id, { matchedItemId: found._id, matchScore: score, status: 'matched' });
          await FoundItem.findByIdAndUpdate(found._id, { matchedItemId: newItem._id, matchScore: score, status: 'matched' });
          const notifyFound = found.reportedBy?._id || found.reportedBy;
          if (notifyFound) {
            const msg = `Potential Match Found! Your found item "${found.itemName}" matches a lost item "${newItem.itemName}" (${score}% match).`;
            await notifyUser(io, notifyFound, { type: 'lost_found_match', title: 'Potential Match Found!', body: msg, data: { severity: 'info', lostItemId: newItem._id?.toString(), foundItemId: found._id?.toString(), matchScore: score } });
            try { await Alert.create({ userId: notifyFound, type: 'general', title: 'Potential Match Found!', message: msg, severity: 'info' }); } catch (e) {}
          }
          const notifyLost = newItem.reportedBy?._id || newItem.reportedBy;
          if (notifyLost) {
            const msg = `Potential Match Found! Your lost item "${newItem.itemName}" matches a found item "${found.itemName}" (${score}% match).`;
            await notifyUser(io, notifyLost, { type: 'lost_found_match', title: 'Potential Match Found!', body: msg, data: { severity: 'info', lostItemId: newItem._id?.toString(), foundItemId: found._id?.toString(), matchScore: score } });
            try { await Alert.create({ userId: notifyLost, type: 'general', title: 'Potential Match Found!', message: msg, severity: 'info' }); } catch (e) {}
          }
          await notifyAllAdmins(io, { type: 'lost_found_match', title: 'Potential Match Found!', body: `Lost "${newItem.itemName}" matched with Found "${found.itemName}" (${score}%)`, data: { severity: 'info' } });
          break;
        }
      }
    } else {
      const openLost = await LostItem.find({ status: 'open' }, { populate: true });
      for (const lost of openLost) {
        const score = calculateMatchScore(lost, newItem);
        if (score >= 60) {
          await FoundItem.findByIdAndUpdate(newItem._id, { matchedItemId: lost._id, matchScore: score, status: 'matched' });
          await LostItem.findByIdAndUpdate(lost._id, { matchedItemId: newItem._id, matchScore: score, status: 'matched' });
          const notifyLost = lost.reportedBy?._id || lost.reportedBy;
          if (notifyLost) {
            const msg = `Potential Match Found! Your lost item "${lost.itemName}" matches a found item "${newItem.itemName}" (${score}% match).`;
            await notifyUser(io, notifyLost, { type: 'lost_found_match', title: 'Potential Match Found!', body: msg, data: { severity: 'info', lostItemId: lost._id?.toString(), foundItemId: newItem._id?.toString(), matchScore: score } });
            try { await Alert.create({ userId: notifyLost, type: 'general', title: 'Potential Match Found!', message: msg, severity: 'info' }); } catch (e) {}
          }
          const notifyFound = newItem.reportedBy?._id || newItem.reportedBy;
          if (notifyFound) {
            const msg = `Potential Match Found! Your found item "${newItem.itemName}" matches a lost item "${lost.itemName}" (${score}% match).`;
            await notifyUser(io, notifyFound, { type: 'lost_found_match', title: 'Potential Match Found!', body: msg, data: { severity: 'info', lostItemId: lost._id?.toString(), foundItemId: newItem._id?.toString(), matchScore: score } });
            try { await Alert.create({ userId: notifyFound, type: 'general', title: 'Potential Match Found!', message: msg, severity: 'info' }); } catch (e) {}
          }
          await notifyAllAdmins(io, { type: 'lost_found_match', title: 'Potential Match Found!', body: `Found "${newItem.itemName}" matched with Lost "${lost.itemName}" (${score}%)`, data: { severity: 'info' } });
          break;
        }
      }
    }
  } catch (e) {
    logger.warn('Matching error:', e.message);
  }
}

router.get('/lost', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};
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
    const { page = 1, limit = 50, status } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};
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
  console.log('Received Lost Item:', JSON.stringify(req.body, null, 2));
  try {
    const body = { ...req.body };
    if (body.dateLost) {
      body.dateLost = body.dateLost.substring(0, 10);
    }

    const item = await LostItem.create({
      ...body,
      status: 'open',
      reportedBy: req.userId,
    });

    const populated = await LostItem.findById(item._id);
    const io = req.app.get('io');
    if (io) {
      io.emit('lost:created', { item: populated });
    }
    runMatching(io, populated, 'lost');

    res.status(201).json({ success: true, message: 'Lost item reported', data: { item: populated } });
  } catch (error) {
    console.error('Lost Item Error:', error);
    logger.error('Create lost item error:', error);
    res.status(500).json({ success: false, message: error.sqlMessage || error.message || 'Failed to report lost item' });
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
  console.log('Received Found Item:', JSON.stringify(req.body, null, 2));
  try {
    const item = await FoundItem.create({
      ...req.body,
      status: 'open',
      reportedBy: req.userId,
    });

    const populated = await FoundItem.findById(item._id);
    const io = req.app.get('io');
    if (io) {
      io.emit('found:created', { item: populated });
    }
    runMatching(io, populated, 'found');

    res.status(201).json({ success: true, message: 'Found item reported', data: { item: populated } });
  } catch (error) {
    console.error('Found Item Error:', error);
    logger.error('Create found item error:', error);
    res.status(500).json({ success: false, message: error.sqlMessage || error.message || 'Failed to report found item' });
  }
});

router.post('/lost/:id/claim', authenticate, async (req, res) => {
  try {
    const lost = await LostItem.findById(req.params.id);
    if (!lost) return res.status(404).json({ success: false, message: 'Lost item not found' });
    if (lost.status !== 'open') return res.status(400).json({ success: false, message: 'This item is no longer available for claim' });
    if (lost.reportedBy === req.userId) return res.status(400).json({ success: false, message: 'You cannot claim your own item' });
    if (lost.claimedBy) return res.status(400).json({ success: false, message: 'Someone already claimed to have found this item' });

    const updated = await LostItem.findByIdAndUpdate(lost._id, { claimedBy: req.userId, status: 'matched' }, { populate: true });

    const io = req.app.get('io');
    const claimer = await User.findById(req.userId);
    const reporterId = updated.reportedBy?._id || updated.reportedBy;

    if (reporterId && claimer) {
      const msg = `Good news! Resident ${claimer.name || 'Someone'} (Tower ${claimer.tower || 'N/A'}-${claimer.flatNumber || 'N/A'}) believes they found your ${lost.itemName}.`;
      await notifyUser(io, reporterId, { type: 'lost_found_claim', title: 'Someone Found Your Item!', body: msg, data: { severity: 'success', lostItemId: lost._id?.toString(), claimerId: req.userId?.toString(), url: '/lost-and-found' } });
      try { await Alert.create({ userId: reporterId, type: 'general', title: 'Your Item May Be Found!', message: msg, severity: 'success' }); } catch (e) {}
    }

    await notifyAllAdmins(io, { type: 'lost_found_claim', title: 'Item Claimed!', body: `${claimer?.name || 'A resident'} claims to have found "${lost.itemName}"`, data: { severity: 'info', lostItemId: lost._id?.toString() } });
    await notifyAllSecurity(io, { type: 'lost_found_claim', title: 'Item Claimed!', body: `${claimer?.name || 'A resident'} claims to have found "${lost.itemName}"`, data: { severity: 'info', lostItemId: lost._id?.toString() } });

    if (io) {
      io.emit('lost:claimed', { item: updated, claimer });
    }

    res.json({ success: true, message: 'Claim submitted. The reporter has been notified.', data: { item: updated } });
  } catch (error) {
    logger.error('Claim lost item error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to submit claim' });
  }
});

router.put('/lost/:id/recover', authenticate, authorize('security', 'admin'), async (req, res) => {
  try {
    const lost = await LostItem.findById(req.params.id);
    if (!lost) return res.status(404).json({ success: false, message: 'Lost item not found' });
    if (lost.status === 'recovered' || lost.status === 'closed') return res.status(400).json({ success: false, message: 'Item already recovered' });

    const updated = await LostItem.findByIdAndUpdate(lost._id, {
      status: 'recovered',
      confirmedById: req.userId,
      recoveredAt: new Date(),
    }, { populate: true });

    const io = req.app.get('io');
    const reporterId = updated.reportedBy?._id || updated.reportedBy;
    if (reporterId) {
      await notifyUser(io, reporterId, { type: 'lost_found_recovered', title: 'Item Marked as Recovered!', body: `Your lost item "${lost.itemName}" has been confirmed as recovered.`, data: { severity: 'success', lostItemId: lost._id?.toString(), url: '/lost-and-found' } });
    }

    if (io) {
      io.emit('lost:recovered', { item: updated });
    }

    res.json({ success: true, message: 'Item marked as recovered', data: { item: updated } });
  } catch (error) {
    logger.error('Recover lost item error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to mark as recovered' });
  }
});

router.get('/my-items', authenticate, async (req, res) => {
  try {
    const [myLost, myFound] = await Promise.all([
      LostItem.find({ reportedBy: req.userId }, { sort: { createdAt: -1 }, populate: true }),
      FoundItem.find({ reportedBy: req.userId }, { sort: { createdAt: -1 }, populate: true }),
    ]);
    res.json({ success: true, data: { lostItems: myLost, foundItems: myFound } });
  } catch (error) {
    logger.error('Get my items error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch your items' });
  }
});

router.put('/lost/:id/close', authenticate, authorize('security', 'admin'), async (req, res) => {
  try {
    const updated = await LostItem.findByIdAndUpdate(req.params.id, { status: 'closed', resolvedAt: new Date() }, { populate: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, message: 'Case closed', data: { item: updated } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to close case' });
  }
});

router.put('/found/:id/return', authenticate, authorize('security', 'admin'), async (req, res) => {
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

router.get('/stats', authenticate, async (req, res) => {
  try {
    const [totalLost, totalFound, openLost, matchedLost, recoveredLost, pendingMatchCount] = await Promise.all([
      LostItem.countDocuments(),
      FoundItem.countDocuments(),
      LostItem.countDocuments({ status: 'open' }),
      LostItem.countDocuments({ status: 'matched' }),
      LostItem.countDocuments({ status: 'recovered' }),
      LostItem.countDocuments({ status: 'matched', claimedBy: { $ne: null } }),
    ]);
    res.json({
      success: true,
      data: {
        totalLost,
        totalFound,
        openLost,
        matchedLost,
        recoveredLost,
        pendingMatches: pendingMatchCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

module.exports = router;
