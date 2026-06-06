const express = require('express');
const { body } = require('express-validator');
const Payment = require('../models/Payment');
const RentInvoice = require('../models/RentInvoice');
const UserNotification = require('../models/UserNotification');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const logger = require('../utils/logger');
const { notifyUser, notifyAllAdmins } = require('../services/notificationHelper');

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

    console.log('GET /payments - User:', req.userId, 'Role:', req.user.role, 'Filter:', JSON.stringify(filter));

    const [payments, total] = await Promise.all([
      Payment.find(filter, { sort: { createdAt: -1 }, skip, limit: pageLimit, populate: true }),
      Payment.countDocuments(filter),
    ]);

    console.log('GET /payments - Payments Found:', payments.length, 'Total:', total);

    res.json({ success: true, data: { payments, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) } });
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

const CHARGE_TYPES = ['maintenance_fee', 'house_rent', 'fine', 'security_deposit', 'parking_fee', 'water_charge', 'electricity_charge', 'other'];

router.post('/', authenticate, authorize('admin'), [
  body('recipientId').notEmpty().withMessage('User not found'),
  body('amount').isNumeric().withMessage('Amount is required'),
  body('type').isIn(CHARGE_TYPES).withMessage('Valid charge type is required'),
  body('title').trim().notEmpty().withMessage('Charge title is required'),
  body('dueDate').isISO8601().withMessage('Invalid due date'),
  body('description').optional().trim(),
], validate, async (req, res) => {
  try {
    const { recipientId, amount, type, title, dueDate, description } = req.body;

    console.log('=== Create Charge ===');
    console.log('Charge Request:', req.body);
    console.log('Target User:', recipientId);
    console.log('Created By:', req.userId);

    const formattedDueDate = new Date(dueDate).toISOString().split('T')[0];
    console.log('Incoming:', dueDate, 'Saving:', formattedDueDate);

    const targetUser = await User.findById(recipientId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const payment = await Payment.create({
      recipient: recipientId,
      sender: recipientId,
      amount,
      type,
      title,
      dueDate: formattedDueDate,
      description: description || '',
      status: 'pending',
      createdBy: req.userId,
    });

    console.log('Payment Created:', { id: payment._id, title, amount, type, status: 'pending' });

    const populated = await Payment.findById(payment._id);

    let chargeNotifId = null;
    try {
      const dueDateFormatted = new Date(formattedDueDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const alert = await Alert.create({
        userId: recipientId,
        type: 'general',
        title: 'New Charge Assigned',
        message: `Type: ${title || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}\nAmount: ₹${amount}\nDue Date: ${dueDateFormatted}`,
        severity: 'info',
      });
      const userNotif = await UserNotification.create({
        userId: recipientId,
        alertId: alert._id,
        read: false,
        deleted: false,
      });
      chargeNotifId = userNotif._id || userNotif.id;
    } catch (notifErr) {
      console.log('Notification creation error:', notifErr.message);
    }

    const io = req.app.get('io');
    const dueDateFormatted = new Date(formattedDueDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    await notifyUser(io, recipientId, { type: 'payment', title: 'New Charge Assigned', body: `Type: ${title || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}\nAmount: ₹${amount}\nDue Date: ${dueDateFormatted}`, data: { severity: 'info', paymentId: payment._id?.toString(), amount } });

    console.log('Charge API Response: success');
    res.status(201).json({ success: true, message: 'Payment charge created successfully', data: { payment: populated } });
  } catch (error) {
    console.log('Charge Error:', error.message);
    if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      return res.status(400).json({ success: false, message: 'Invalid value for one or more fields' });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Duplicate entry detected' });
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ success: false, message: 'User not found' });
    }
    logger.error('Create payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Database insert failed' });
  }
});

router.put('/:id/pay', authenticate, [
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'upi', 'net_banking']),
  body('transactionId').optional().trim(),
], validate, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paymentMethod: req.body.paymentMethod, transactionId: req.body.transactionId || 'TXN' + Date.now(), paidAt: new Date() },
      { new: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    const receiptNumber = 'RCT-' + payment._id + '-' + Date.now().toString(36).toUpperCase();

    if (payment.type === 'house_rent') {
      const invoice = await RentInvoice.findOne({ paymentId: payment._id });
      if (invoice) {
        await RentInvoice.findByIdAndUpdate(invoice._id, { status: 'paid', paidAt: new Date() });
      }
    }

    const resident = await User.findById(payment.recipientId);
    const residentName = resident ? (resident.name || resident.full_name || resident.username || 'Resident') : 'Resident';

    const adminUsers = await User.find({ role: 'admin' });

    try {
      const residentAlert = await Alert.create({
        userId: payment.recipientId,
        type: 'general',
        title: 'Rent Payment Successful',
        message: `Your house rent payment has been received.\nAmount: ₹${payment.amount}\nPaid On: ${new Date().toLocaleDateString()}\nReceipt: ${receiptNumber}`,
        severity: 'info',
      });
      const residentNotif = await UserNotification.create({
        userId: payment.recipientId,
        alertId: residentAlert._id,
        read: false,
        deleted: false,
      });

      for (const admin of adminUsers) {
        const adminAlert = await Alert.create({
          userId: admin._id,
          type: 'general',
          title: 'Rent Payment Received',
          message: `Resident ${residentName} has paid the monthly house rent.\nAmount: ₹${payment.amount}\nPaid On: ${new Date().toLocaleDateString()}`,
          severity: 'info',
        });
        await UserNotification.create({
          userId: admin._id,
          alertId: adminAlert._id,
          read: false,
          deleted: false,
        });
      }

      const io = req.app.get('io');
      await notifyUser(io, payment.recipientId, { type: 'payment', title: 'Rent Payment Successful', body: `Your house rent payment has been received.\nAmount: ₹${payment.amount}\nPaid On: ${new Date().toLocaleDateString()}\nReceipt: ${receiptNumber}`, data: { severity: 'info', paymentId: payment._id?.toString() } });
      await notifyAllAdmins(io, { type: 'payment', title: 'Rent Payment Received', body: `Resident ${residentName} has paid the monthly house rent.\nAmount: ₹${payment.amount}`, data: { severity: 'info', paymentId: payment._id?.toString() } });
    } catch (notifErr) {
      console.log('Post-payment notification error:', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Payment successful',
      data: {
        payment,
        receipt: {
          number: receiptNumber,
          amount: payment.amount,
          date: new Date().toISOString(),
          type: payment.type,
          status: 'paid',
          paymentMethod: req.body.paymentMethod,
        },
      },
    });
  } catch (error) {
    console.log('Payment pay error:', error.message);
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
    const [pendingRows] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM payments WHERE status = 'pending'${filterStr}`,
      match.recipient ? [match.recipient] : []
    );
    const [paidRows] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM payments WHERE status = 'paid'${filterStr}`,
      match.recipient ? [match.recipient] : []
    );
    const [overdueRows] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM payments WHERE status = 'overdue'${filterStr}`,
      match.recipient ? [match.recipient] : []
    );

    res.json({
      success: true,
      data: {
        pending: pendingRows || { total: 0, count: 0 },
        paid: paidRows || { total: 0, count: 0 },
        overdue: overdueRows || { total: 0, count: 0 },
      },
    });
  } catch (error) {
    logger.error('Get payments summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

router.post('/check-overdue', authenticate, async (req, res) => {
  try {
    const { db: rawDb } = require('../models/dbHelpers');
    const today = new Date().toISOString().split('T')[0];

    let overduePayments;

    if (req.user.role === 'admin') {
      const [rows] = await rawDb.query(
        "SELECT id FROM payments WHERE status = 'pending' AND dueDate < ?",
        [today]
      );
      overduePayments = rows;
    } else {
      const [rows] = await rawDb.query(
        "SELECT id FROM payments WHERE status = 'pending' AND dueDate < ? AND recipientId = ?",
        [today, req.userId]
      );
      overduePayments = rows;
    }

    for (const p of overduePayments) {
      await Payment.findByIdAndUpdate(p.id, { status: 'overdue' });
    }

    const lateFee = 500;
    const [overdueRentPayments] = await rawDb.query(
      "SELECT id FROM payments WHERE status = 'overdue' AND type = 'house_rent' AND title NOT LIKE '%+ Late Fee%'",
    );

    for (const p of overdueRentPayments) {
      const payment = await Payment.findById(p.id);
      if (payment) {
        const newAmount = parseFloat(payment.amount) + lateFee;
        await Payment.findByIdAndUpdate(p.id, {
          amount: newAmount,
          title: 'Monthly House Rent + Late Fee',
          description: `${payment.description || 'House rent'} (includes ₹${lateFee} late fee)`,
        });
      }
    }

    res.json({ success: true, message: `Overdue check complete. ${overduePayments.length} payments marked overdue.` });
  } catch (error) {
    console.log('Overdue check error:', error.message);
    res.status(500).json({ success: false, message: 'Overdue check failed' });
  }
});

module.exports = router;
