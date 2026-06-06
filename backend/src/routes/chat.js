const express = require('express');
const { body } = require('express-validator');
const { Message, Conversation } = require('../models/Chat');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { db } = require('../models/dbHelpers');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const convRows = await db.query(
      `SELECT c.id, c.lastMessage, c.lastMessageAt, c.lastSender, c.createdAt, c.updatedAt
       FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversationId
       WHERE cp.userId = ?
       ORDER BY c.lastMessageAt DESC`,
      [userId]
    );

    const conversationsWithUnread = await Promise.all(convRows.map(async (conv) => {
      const pRows = await db.query(
        'SELECT userId FROM conversation_participants WHERE conversationId = ?',
        [conv.id]
      );
      const participants = await Promise.all(
        pRows.map(p => User.findById(p.userId))
      );

      const otherUser = participants.find(p => p && p._id !== userId);
      let unreadCount = 0;
      if (otherUser) {
        const countRows = await db.query(
          'SELECT COUNT(*) AS count FROM messages WHERE senderId = ? AND receiverId = ? AND isRead = false AND conversationId = ?',
          [otherUser._id, userId, conv.id]
        );
        unreadCount = countRows[0]?.count || 0;
      }

      let lastSender = null;
      if (conv.lastSender) lastSender = await User.findById(conv.lastSender);

      return {
        _id: conv.id,
        participants: participants.filter(Boolean),
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        lastSender,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        unreadCount,
      };
    }));

    res.json({ success: true, data: { conversations: conversationsWithUnread } });
  } catch (error) {
    logger.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
});

router.get('/conversations/:userId', authenticate, async (req, res) => {
  try {
    const u1 = req.userId;
    const u2 = parseInt(req.params.userId);
    const cpRows = await db.query(
      `SELECT cp1.conversationId FROM conversation_participants cp1
       JOIN conversation_participants cp2 ON cp1.conversationId = cp2.conversationId
       WHERE cp1.userId = ? AND cp2.userId = ?`,
      [u1, u2]
    );

    if (!cpRows.length) return res.json({ success: true, data: { conversation: null } });

    const convId = cpRows[0].conversationId;
    const convRows = await db.query('SELECT * FROM conversations WHERE id = ?', [convId]);
    if (!convRows.length) return res.json({ success: true, data: { conversation: null } });

    const conv = convRows[0];
    const pRows = await db.query('SELECT userId FROM conversation_participants WHERE conversationId = ?', [convId]);
    const participants = await Promise.all(pRows.map(p => User.findById(p.userId)));

    let lastSender = null;
    if (conv.lastSender) lastSender = await User.findById(conv.lastSender);

    res.json({
      success: true,
      data: {
        conversation: {
          _id: conv.id,
          participants: participants.filter(Boolean),
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          lastSender,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
  }
});

router.get('/messages/:userId', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    const u1 = req.userId;
    const u2 = parseInt(req.params.userId);

    const msgRows = await db.query(
      `SELECT id, senderId, receiverId, message, isRead AS \`read\`, readAt, createdAt, updatedAt
       FROM messages
       WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [u1, u2, u2, u1, String(limit), String(skip)]
    );

    await db.query(
      'UPDATE messages SET isRead = true, readAt = NOW() WHERE senderId = ? AND receiverId = ? AND isRead = false',
      [u2, u1]
    );

    const [totalRows] = await db.query(
      'SELECT COUNT(*) AS count FROM messages WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)',
      [u1, u2, u2, u1]
    );

    const messages = await Promise.all(msgRows.reverse().map(async (m) => {
      const [sender, receiver] = await Promise.all([
        User.findById(m.senderId),
        User.findById(m.receiverId),
      ]);
      return { _id: m.id, sender, receiver, message: m.message, read: !!m.read, readAt: m.readAt, createdAt: m.createdAt, updatedAt: m.updatedAt };
    }));

    res.json({
      success: true,
      data: { messages, total: totalRows?.count || 0, page: Number(page), pages: Math.ceil((totalRows?.count || 0) / Number(limit)) },
    });
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

router.post('/send', authenticate, [
  body('receiverId').notEmpty(),
  body('message').trim().notEmpty(),
], validate, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.userId;

    const msg = await Message.create({ sender: senderId, receiver: receiverId, message });

    let cpRows = await db.query(
      `SELECT cp1.conversationId FROM conversation_participants cp1
       JOIN conversation_participants cp2 ON cp1.conversationId = cp2.conversationId
       WHERE cp1.userId = ? AND cp2.userId = ?`,
      [senderId, receiverId]
    );

    let convId;
    if (cpRows.length) {
      convId = cpRows[0].conversationId;
      await db.query('UPDATE conversations SET lastMessage = ?, lastMessageAt = NOW(), lastSender = ? WHERE id = ?', [message, senderId, convId]);
    } else {
      const convResult = await db.query('INSERT INTO conversations (lastMessage, lastMessageAt, lastSender) VALUES (?, NOW(), ?)', [message, senderId]);
      convId = convResult.insertId;
      await db.query('INSERT INTO conversation_participants (conversationId, userId) VALUES (?,?), (?,?)', [convId, senderId, convId, receiverId]);
    }

    await db.query('UPDATE messages SET conversationId = ? WHERE id = ?', [convId, msg._id]);

    let populated = await Message.findById(msg._id);
    const [senderUser, receiverUser] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId),
    ]);
    if (populated && senderUser && receiverUser) {
      populated.sender = senderUser;
      populated.receiver = receiverUser;
      delete populated.senderId;
      delete populated.receiverId;
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${senderId}`).emit('chat:message', populated);
      io.to(`user:${receiverId}`).emit('chat:message', populated);

      let conversationData = null;
      if (msg.conversationId) {
        const conv = await Conversation.findById(msg.conversationId);
        if (conv) {
          const pRows = await db.query('SELECT userId FROM conversation_participants WHERE conversationId = ?', [msg.conversationId]);
          const participants = await Promise.all(pRows.map(p => User.findById(p.userId)));
          conversationData = { ...conv, participants: participants.filter(Boolean) };
          io.to(`user:${senderId}`).emit('conversation:updated', conversationData);
          io.to(`user:${receiverId}`).emit('conversation:updated', conversationData);
        }
      }

      io.to(`user:${receiverId}`).emit('chat:notification', {
        _id: `chat-${Date.now()}`, from: senderUser.name, message,
        conversationId: msg.conversationId || senderId, senderId: String(senderId),
        createdAt: new Date().toISOString(),
      });
    }

    res.status(201).json({ success: true, data: { message: populated } });
  } catch (error) {
    logger.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

router.get('/unread-counts', authenticate, async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT senderId AS _id, COUNT(*) AS count FROM messages WHERE receiverId = ? AND isRead = false GROUP BY senderId',
      [req.userId]
    );
    const result = {};
    rows.forEach((r) => { result[r._id] = r.count; });
    res.json({ success: true, data: { counts: result } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch unread counts' });
  }
});

router.delete('/conversations/:id', authenticate, async (req, res) => {
  try {
    const convId = parseInt(req.params.id);
    const userId = req.userId;
    const pRows = await db.query('SELECT userId FROM conversation_participants WHERE conversationId = ?', [convId]);
    const isParticipant = pRows.some(p => String(p.userId) === String(userId));
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Not a participant' });
    await db.query('DELETE FROM messages WHERE conversationId = ?', [convId]);
    await db.query('DELETE FROM conversation_participants WHERE conversationId = ?', [convId]);
    await db.query('DELETE FROM conversations WHERE id = ?', [convId]);
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    logger.error('Delete conversation error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete conversation' });
  }
});

router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const rows = await db.query('SELECT COUNT(*) AS count FROM messages WHERE receiverId = ? AND isRead = false', [req.userId]);
    res.json({ success: true, data: { count: rows[0]?.count || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
});

module.exports = router;
