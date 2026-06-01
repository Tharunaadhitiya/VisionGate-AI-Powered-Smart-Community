const express = require('express');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { db } = require('../models/dbHelpers');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json({ success: true, data: { results: [] } });
    const keyword = `%${q.trim()}%`;

    const queries = [
      { type: 'users', sql: `SELECT id AS _id, name AS title, email AS subtitle, 'users' AS \`type\`, '/users' AS link FROM users WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ?)`, params: [keyword, keyword, keyword] },
      { type: 'complaints', sql: `SELECT id AS _id, title, description AS subtitle, 'complaints' AS \`type\`, '/complaints' AS link FROM complaints WHERE (title LIKE ? OR description LIKE ?)`, params: [keyword, keyword] },
      { type: 'visitors', sql: `SELECT id AS _id, name AS title, CONCAT(phone, ' - ', vehicleNumber) AS subtitle, 'visitors' AS \`type\`, '/visitors' AS link FROM visitors WHERE (name LIKE ? OR phone LIKE ? OR vehicleNumber LIKE ?)`, params: [keyword, keyword, keyword] },
      { type: 'payments', sql: `SELECT id AS _id, description AS title, \`type\` AS subtitle, 'payments' AS \`type\`, '/payments' AS link FROM payments WHERE (description LIKE ? OR \`type\` LIKE ?)`, params: [keyword, keyword] },
      { type: 'alerts', sql: `SELECT id AS _id, title, message AS subtitle, 'alerts' AS \`type\`, '/alerts' AS link FROM alerts WHERE (title LIKE ? OR message LIKE ?)`, params: [keyword, keyword] },
      { type: 'notices', sql: `SELECT id AS _id, title, description AS subtitle, 'notices' AS \`type\`, '/notices' AS link FROM notices WHERE (title LIKE ? OR description LIKE ?) AND isActive = true`, params: [keyword, keyword] },
      { type: 'incidents', sql: `SELECT id AS _id, title, description AS subtitle, 'incidents' AS \`type\`, '/incidents' AS link FROM incidents WHERE (title LIKE ? OR description LIKE ?)`, params: [keyword, keyword] },
      { type: 'messages', sql: `SELECT id AS _id, CONCAT(LEFT(content, 100), '...') AS title, CONCAT('From user ', senderId) AS subtitle, 'messages' AS \`type\`, '/chat' AS link FROM messages WHERE content LIKE ?`, params: [keyword] },
    ];

    const allResults = [];
    for (const { type, sql, params } of queries) {
      try {
        const rows = await db.query(sql, params);
        for (const r of rows) {
          allResults.push({ _id: r._id, title: r.title || '', subtitle: r.subtitle || '', type: r.type || type, link: r.link || '' });
        }
      } catch (e) {
        logger.warn(`Search query failed for ${type}:`, e.message);
      }
    }

    const grouped = {};
    for (const r of allResults) {
      if (!grouped[r.type]) grouped[r.type] = [];
      if (grouped[r.type].length < 5) grouped[r.type].push(r);
    }

    res.json({ success: true, data: { results: grouped } });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

module.exports = router;
