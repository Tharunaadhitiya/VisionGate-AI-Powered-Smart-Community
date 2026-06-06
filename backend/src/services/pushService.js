const webpush = require('web-push');
const { db } = require('../models/dbHelpers');
const logger = require('../utils/logger');

const TABLE = 'push_subscriptions';

async function subscribe(userId, subscription, deviceName) {
  const existing = await db.query(
    `SELECT * FROM ${TABLE} WHERE userId = ? AND endpoint = ?`,
    [userId, subscription.endpoint]
  );
  if (existing.length > 0) {
    await db.query(
      `UPDATE ${TABLE} SET p256dh = ?, auth = ?, updatedAt = NOW() WHERE userId = ? AND endpoint = ?`,
      [subscription.keys.p256dh, subscription.keys.auth, userId, subscription.endpoint]
    );
    return existing[0];
  }
  const result = await db.query(
    `INSERT INTO ${TABLE} (userId, endpoint, p256dh, auth, deviceName) VALUES (?, ?, ?, ?, ?)`,
    [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, deviceName || null]
  );
  return { id: result.insertId, userId, endpoint: subscription.endpoint };
}

async function unsubscribe(userId, endpoint) {
  await db.query(
    `DELETE FROM ${TABLE} WHERE userId = ? AND endpoint = ?`,
    [userId, endpoint]
  );
}

async function getSubscriptions(userId) {
  const rows = await db.query(
    `SELECT * FROM ${TABLE} WHERE userId = ? ORDER BY createdAt DESC`,
    [userId]
  );
  return rows;
}

async function getAllSubscriptions() {
  const rows = await db.query(`SELECT * FROM ${TABLE} ORDER BY createdAt DESC`);
  return rows;
}

async function sendPush(userId, title, body, data = {}) {
  const subs = await db.query(
    `SELECT * FROM ${TABLE} WHERE userId = ?`,
    [userId]
  );
  if (subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;

  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      data,
      timestamp: new Date().toISOString(),
    });

    try {
      await webpush.sendNotification(pushSub, payload);
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.query(`DELETE FROM ${TABLE} WHERE id = ?`, [sub.id]);
      }
      failed++;
    }
  }

  return { sent, failed };
}

async function sendPushToAll(title, body, data = {}) {
  const subs = await getAllSubscriptions();
  if (subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;

  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      data,
      timestamp: new Date().toISOString(),
    });

    try {
      await webpush.sendNotification(pushSub, payload);
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.query(`DELETE FROM push_subscriptions WHERE id = ?`, [sub.id]);
      }
      failed++;
    }
  }

  return { sent, failed };
}

async function getNotificationPreferences(userId) {
  const rows = await db.query(
    `SELECT * FROM notification_preferences WHERE userId = ?`,
    [userId]
  );
  if (rows.length === 0) {
    return {
      visitorRequests: true,
      visitorApprovals: true,
      maintenanceReminders: true,
      packageArrivals: true,
      emergencyAlerts: true,
      pollsAndVoting: true,
      lostAndFound: true,
      passwordRecovery: true,
    };
  }
  return rows[0];
}

async function updateNotificationPreferences(userId, prefs) {
  const existing = await db.query(
    `SELECT * FROM notification_preferences WHERE userId = ?`,
    [userId]
  );
  if (existing.length > 0) {
    const sets = [];
    const params = [];
    for (const [key, val] of Object.entries(prefs)) {
      if (key !== 'userId') {
        sets.push(`${key} = ?`);
        params.push(val);
      }
    }
    if (sets.length > 0) {
      params.push(userId);
      await db.query(
        `UPDATE notification_preferences SET ${sets.join(', ')} WHERE userId = ?`,
        params
      );
    }
  } else {
    const cols = ['userId'];
    const vals = [userId];
    const phs = ['?'];
    for (const [key, val] of Object.entries(prefs)) {
      if (key !== 'userId') {
        cols.push(key);
        vals.push(val);
        phs.push('?');
      }
    }
    await db.query(
      `INSERT INTO notification_preferences (${cols.join(',')}) VALUES (${phs.join(',')})`,
      vals
    );
  }
  return getNotificationPreferences(userId);
}

async function shouldNotify(userId, notificationType) {
  const prefs = await getNotificationPreferences(userId);
  return prefs[notificationType] !== false;
}

async function getNotificationHistory(userId, limit = 50, offset = 0) {
  const rows = await db.query(
    `SELECT * FROM notification_history WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM notification_history WHERE userId = ?`,
    [userId]
  );
  return { rows, total: countResult[0]?.total || 0 };
}

module.exports = {
  subscribe,
  unsubscribe,
  getSubscriptions,
  getAllSubscriptions,
  sendPush,
  sendPushToAll,
  getNotificationPreferences,
  updateNotificationPreferences,
  shouldNotify,
  getNotificationHistory,
};
