const express = require('express');
const House = require('../models/House');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json({ success: true, data: { houses: [] } });
    const houses = await House.search(q.trim());
    res.json({ success: true, data: { houses } });
  } catch (error) {
    logger.error('House search error:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const houses = await House.find({}, { sort: { houseCode: 1 }, populate: true });
    res.json({ success: true, data: { houses } });
  } catch (error) {
    logger.error('Get houses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch houses' });
  }
});

router.get('/towers', authenticate, async (req, res) => {
  try {
    logger.info('[GET /houses/towers] Loading towers...');
    const towers = await House.getTowers();
    logger.info(`[GET /houses/towers] Towers found: ${towers.join(',') || 'none'}`);
    const allResidents = await User.find({ role: 'resident', isActive: true });
    logger.info(`[GET /houses/towers] Found ${allResidents.length} active residents`);
    res.json({ success: true, data: { towers } });
  } catch (error) {
    logger.error('[GET /houses/towers] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch towers' });
  }
});

router.get('/flats', authenticate, async (req, res) => {
  try {
    const { tower } = req.query;
    if (!tower) return res.status(400).json({ success: false, message: 'Tower parameter is required' });
    logger.info(`[GET /houses/flats] Loading flats for tower ${tower}...`);
    const flats = await House.getFlatsByTower(tower);
    logger.info(`[GET /houses/flats] Tower ${tower}: ${flats.length} flats loaded: ${flats.map(f => f.houseCode).join(',') || 'none'}`);
    res.json({ success: true, data: { flats } });
  } catch (error) {
    logger.error('[GET /houses/flats] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch flats' });
  }
});

module.exports = router;
