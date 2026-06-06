const pushService = require('./pushService');
const { db } = require('../models/dbHelpers');
const logger = require('../utils/logger');

async function notifyUser(io, userId, notification) {
  const { type, title, body, data = {} } = notification;

  if (io) {
    io.to(`user:${userId}`).emit('notification:received', {
      type,
      title,
      message: body || title,
      ...data,
      severity: data.severity || 'info',
    });
  }

  try {
    await db.query(
      `INSERT INTO notification_history (userId, title, body, type, data) VALUES (?, ?, ?, ?, ?)`,
      [userId, title, body || '', type, JSON.stringify(data)]
    );
  } catch (err) {
    logger.warn('Failed to save notification history:', err.message);
  }

  try {
    const shouldSend = await pushService.shouldNotify(userId, type);
    if (shouldSend) {
      await pushService.sendPush(userId, title, body || title, { url: data.url || '/', type, ...data });
    }
  } catch (err) {
    logger.warn('Push notification error:', err.message);
  }
}

async function notifyAllAdmins(io, notification) {
  const User = require('../models/User');
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    await notifyUser(io, admin._id, notification);
  }
}

async function notifyAllSecurity(io, notification) {
  const User = require('../models/User');
  const security = await User.find({ role: 'security' });
  for (const s of security) {
    await notifyUser(io, s._id, notification);
  }
}

async function notifyRole(io, role, notification) {
  const User = require('../models/User');
  const users = await User.find({ role });
  for (const u of users) {
    await notifyUser(io, u._id, notification);
  }
}

module.exports = { notifyUser, notifyAllAdmins, notifyAllSecurity, notifyRole };
