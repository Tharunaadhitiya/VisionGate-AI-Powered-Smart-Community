const express = require('express');
const { body } = require('express-validator');
const Payment = require('../models/Payment');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};

    if (req.user.role === 'admin') {
    } else if (req.user.role === 'resident') {
      filter.recipient = req.userId;
    } else {
      filter.recipient = req.userId;
    }

    if (status) filter.status = status;

    const [payments, total] = await Promise.all([
      Payment.find(filter, { sort: { createdAt: -1 }, skip, limit: pageLimit, populate: true }),
      Payment.countDocuments(filter),
    ]);

    res.json({ success: true, data: { payments, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) } });
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

router.post('/', authenticate, authorize('admin'), [
  body('recipientId').notEmpty(),
  body('amount').isNumeric().withMessage('Amount is required'),
  body('type').isIn(['rent', 'maintenance', 'penalty', 'fine', 'other']),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('description').optional().trim(),
], validate, async (req, res) => {
  try {
    const { recipientId, amount, type, dueDate, description } = req.body;

    const payment = await Payment.create({
      recipient: recipientId,
      sender: recipientId,
      amount,
      type,
      dueDate,
      description,
      status: 'pending',
      createdBy: req.userId,
    });

    const populated = await Payment.findById(payment._id);

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${recipientId}`).emit('payment:notification', { message: `Payment request: ${description || type} - $${amount}`, paymentId: payment._id, amount, type, description, dueDate });
    }

    res.status(201).json({ success: true, message: 'Payment request sent', data: { payment: populated } });
  } catch (error) {
    logger.error('Create payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment request' });
  }
});

router.put('/:id/pay', authenticate, [
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'upi', 'net_banking', 'cash']),
  body('transactionId').optional().trim(),
], validate, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paymentMethod: req.body.paymentMethod, transactionId: req.body.transactionId, paidAt: new Date() },
      { new: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, message: 'Payment successful', data: { payment } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payment failed' });
  }
});

router.put('/:id/cancel', authenticate, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    res.json({ success: true, message: 'Payment cancelled', data: { payment } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel payment' });
  }
});

router.get('/summary', authenticate, async (req, res) => {
  try {
    const match = req.user.role === 'admin' ? {} : { recipient: req.userId };
    const filterStr = match.recipient ? ' WHERE recipientId = ?' : '';

    const { db } = require('../models/dbHelpers');
    const [pendingResult] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM payments WHERE status = 'pending'${filterStr}`,
      match.recipient ? [match.recipient] : []
    );
    const [paidResult] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM payments WHERE status = 'paid'${filterStr}`,
      match.recipient ? [match.recipient] : []
    );
    const [overdueResult] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM payments WHERE status = 'overdue'${filterStr}`,
      match.recipient ? [match.recipient] : []
    );

    res.json({
      success: true,
      data: {
        pending: pendingResult[0] || { total: 0, count: 0 },
        paid: paidResult[0] || { total: 0, count: 0 },
        overdue: overdueResult[0] || { total: 0, count: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

module.exports = router;
