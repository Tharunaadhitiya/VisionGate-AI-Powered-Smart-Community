const User = require('../models/User');
const UserNotification = require('../models/UserNotification');
const logger = require('./logger');

async function getTargetUserIds(target, targetUsers, broadcastTo) {
  if (target === 'individuals' && targetUsers?.length) {
    return targetUsers.filter(Boolean);
  }

  const roleMap = { 'residents': 'resident' };
  const roles = broadcastTo && broadcastTo.length
    ? broadcastTo.filter((r) => r !== 'all').map((r) => roleMap[r] || r)
    : [];

  const includeAll = broadcastTo?.includes('all') || target === 'all';

  if (!includeAll && roles.length === 0) return [];

  let filter = { isActive: true, deletedAt: null };
  if (!includeAll && roles.length > 0) {
    filter.role = roles.length === 1 ? roles[0] : roles;
  }

  const users = await User.find(filter);
  return users.map((u) => u._id);
}

async function dispatchNotification({ alertId, target, targetUsers, broadcastTo, io, eventName, payload }) {
  try {
    const userIds = await getTargetUserIds(target, targetUsers, broadcastTo);

    if (userIds.length === 0) return [];

    for (const userId of userIds) {
      const existing = await UserNotification.findOne({ userId, alertId });
      if (!existing) {
        await UserNotification.create({ userId, alertId, read: false, deleted: false });
      }
    }

    const allRecords = await UserNotification.find({ alertId });
    const notifIds = {};
    allRecords.forEach((rec) => { notifIds[String(rec.userId)] = rec._id; });

    if (io) {
      userIds.forEach((userId) => {
        const notifId = notifIds[String(userId)];
        if (notifId) {
          io.to(`user:${String(userId)}`).emit(eventName || 'notification:received', {
            ...(typeof payload === 'function' ? payload() : payload || {}),
            userNotificationId: notifId,
          });
        }
      });
    }

    return Object.values(notifIds);
  } catch (error) {
    logger.error('dispatchNotification error:', error);
    return [];
  }
}

module.exports = { dispatchNotification, getTargetUserIds };
