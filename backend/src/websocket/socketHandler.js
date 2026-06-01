const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Message, Conversation } = require('../models/Chat');
const { db } = require('../models/dbHelpers');
const config = require('../config');
const logger = require('../utils/logger');

const onlineUsers = new Map();

const wrapSocket = (socket, handler) => {
  return (...args) => {
    try {
      const result = handler(...args);
      if (result && typeof result.catch === 'function') {
        result.catch((err) => {
          logger.error(`Socket handler error (${socket.id}):`, err);
        });
      }
    } catch (err) {
      logger.error(`Socket handler error (${socket.id}):`, err);
    }
  };
};

const setupSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      socket.userId = String(user._id);
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.user.name} (${socket.user.role})`);

    socket.on('error', (err) => {
      logger.error(`Socket error (${socket.id}):`, err);
    });

    onlineUsers.set(socket.userId, { userId: socket.userId, name: socket.user.name, role: socket.user.role, socketId: socket.id, onlineAt: new Date() });
    io.emit('presence:online', Array.from(onlineUsers.values()));

    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.user.role}`);
    socket.join('all');

    socket.on('subscribe:visitor', wrapSocket(socket, (visitorId) => {
      socket.join(`visitor:${visitorId}`);
    }));

    socket.on('subscribe:alert', wrapSocket(socket, (alertId) => {
      socket.join(`alert:${alertId}`);
    }));

    socket.on('subscribe:tower', wrapSocket(socket, (tower) => {
      if (tower) socket.join(`tower:${tower}`);
    }));

    socket.on('visitor:update', wrapSocket(socket, (data) => {
      io.to(`visitor:${data.visitorId}`).emit('visitor:updated', data);
      io.to(`user:${data.residentId}`).emit('notification:visitor', data);
    }));

    socket.on('alert:new', wrapSocket(socket, (data) => {
      if (data.broadcastTo) {
        data.broadcastTo.forEach((role) => {
          if (role === 'all') io.emit('alert:received', data);
          else io.to(`role:${role}`).emit('alert:received', data);
        });
      }
    }));

    socket.on('sos:trigger', wrapSocket(socket, (data) => {
      io.to('role:security').emit('sos:emergency', { ...data, from: socket.user.name, flat: socket.user.flatNumber, tower: socket.user.tower, userId: socket.userId });
      io.to('role:admin').emit('sos:emergency', { ...data, from: socket.user.name, flat: socket.user.flatNumber, tower: socket.user.tower, userId: socket.userId });
    }));

    socket.on('notification:send', wrapSocket(socket, (data) => {
      if (data.userId) io.to(`user:${data.userId}`).emit('notification:received', data);
      if (data.role) io.to(`role:${data.role}`).emit('notification:received', data);
    }));

    socket.on('chat:send', wrapSocket(socket, async (data) => {
      const senderId = Number(socket.userId);
      const receiverId = Number(data.receiverId);

      const msg = await Message.create({ sender: senderId, receiver: receiverId, message: data.message });

      let convId = msg.conversationId;
      let conversationData = null;

      if (convId) {
        await Conversation.updateOne(
          { _id: convId },
          { $set: { lastMessage: data.message, lastMessageAt: new Date(), lastSender: senderId } }
        );
        const conv = await Conversation.findById(convId);
        if (conv) {
          const pRows = await db.query('SELECT userId FROM conversation_participants WHERE conversationId = ?', [convId]);
          const participants = await Promise.all(pRows.map(p => User.findById(p.userId)));
          conversationData = { ...conv, participants: participants.filter(Boolean) };
        }
      }

      const [senderUser, receiverUser] = await Promise.all([
        User.findById(senderId),
        User.findById(receiverId),
      ]);

      const populatedMsg = await Message.findById(msg._id);
      if (populatedMsg && senderUser && receiverUser) {
        populatedMsg.sender = senderUser;
        populatedMsg.receiver = receiverUser;
        delete populatedMsg.senderId;
        delete populatedMsg.receiverId;
      }

      io.to(`user:${socket.userId}`).emit('chat:message', populatedMsg);
      io.to(`user:${data.receiverId}`).emit('chat:message', populatedMsg);

      if (conversationData) {
        io.to(`user:${socket.userId}`).emit('conversation:updated', conversationData);
        io.to(`user:${data.receiverId}`).emit('conversation:updated', conversationData);
      }

      io.to(`user:${data.receiverId}`).emit('chat:notification', {
        _id: `chat-${Date.now()}`,
        from: senderUser?.name || 'Someone',
        message: data.message,
        conversationId: convId || senderId,
        senderId: socket.userId,
        createdAt: new Date().toISOString(),
      });
    }));

    socket.on('chat:typing', wrapSocket(socket, (data) => {
      io.to(`user:${data.receiverId}`).emit('chat:typing', { userId: socket.userId, name: socket.user.name });
    }));

    socket.on('chat:stopTyping', wrapSocket(socket, (data) => {
      io.to(`user:${data.receiverId}`).emit('chat:stopTyping', { userId: socket.userId });
    }));

    socket.on('message:read', wrapSocket(socket, async (data) => {
      if (data.senderId) {
        await db.query(
          'UPDATE messages SET isRead = true, readAt = NOW() WHERE senderId = ? AND receiverId = ? AND isRead = false',
          [Number(data.senderId), Number(socket.userId)]
        );
        io.to(`user:${data.senderId}`).emit('messages:read', { readBy: socket.userId, conversationId: data.conversationId });
      }
    }));

    socket.on('presence:request', wrapSocket(socket, () => {
      socket.emit('presence:online', Array.from(onlineUsers.values()));
    }));

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.user.name}`);
      onlineUsers.delete(socket.userId);
      io.emit('presence:offline', { userId: socket.userId });
    });
  });

  return io;
};

module.exports = setupSocketHandlers;
