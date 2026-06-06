const express = require('express');
const { body } = require('express-validator');
const RentConfig = require('../models/RentConfig');
const RentInvoice = require('../models/RentInvoice');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Alert = require('../models/Alert');
const UserNotification = require('../models/UserNotification');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/configs', authenticate, authorize('admin'), async (req, res) => {
  try {
    const configs = await RentConfig.find({}, { populate: true });
    res.json({ success: true, data: { configs } });
  } catch (error) {
    logger.error('Fetch rent configs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rent configurations' });
  }
});

router.post('/configuration', authenticate, authorize('admin'), [
  body('userId').notEmpty().withMessage('Resident is required'),
  body('monthlyRent').isNumeric().withMessage('Monthly rent amount is required'),
  body('dueDay').isInt({ min: 1, max: 28 }).withMessage('Due day must be between 1-28'),
  body('lateFee').optional().isNumeric(),
  body('startDate').isISO8601().withMessage('Start date is required'),
], validate, async (req, res) => {
  try {
    console.log('Creating rent config - body:', JSON.stringify(req.body));

    const resident = await User.findById(req.body.userId);
    if (!resident) {
      return res.status(404).json({ success: false, message: 'Resident user not found' });
    }
    if (resident.role !== 'resident') {
      return res.status(400).json({ success: false, message: 'User must have role "resident" to set house rent' });
    }

    const existing = await RentConfig.findOne({ user_id: req.body.userId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Rent configuration already exists for this resident' });
    }

    const dbData = {
      user_id: req.body.userId,
      monthly_rent: req.body.monthlyRent,
      due_day: req.body.dueDay,
      late_fee: req.body.lateFee || 0,
      start_date: req.body.startDate.split('T')[0],
      is_active: true,
      created_by: req.userId,
    };

    console.log('Inserting rent config:', JSON.stringify(dbData));
    const config = await RentConfig.create(dbData);
    console.log('Rent config created with id:', config._id);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodMonth = `${year}-${month}`;
    const dueDate = new Date(year, now.getMonth(), req.body.dueDay);
    if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const invoice = await RentInvoice.create({
      configId: config._id,
      residentId: req.body.userId,
      amount: req.body.monthlyRent,
      lateFee: req.body.lateFee || 0,
      dueDate: dueDateStr,
      periodMonth,
      status: 'pending',
    });
    console.log('First invoice created with id:', invoice._id);

    const payment = await Payment.create({
      recipient: req.body.userId,
      sender: req.body.userId,
      amount: req.body.monthlyRent,
      type: 'house_rent',
      title: 'Monthly House Rent',
      description: `House rent for ${periodMonth}`,
      dueDate: dueDateStr,
      status: 'pending',
      createdBy: req.userId,
    });
    console.log('Payment record created with id:', payment._id);

    await RentInvoice.findByIdAndUpdate(invoice._id, { paymentId: payment._id });

    let userNotifId = null;
    try {
      const alert = await Alert.create({
        userId: req.body.userId,
        type: 'general',
        title: 'House Rent Generated',
        message: `Your monthly house rent has been generated.\nAmount: ₹${req.body.monthlyRent}\nDue Date: ${dueDate.toLocaleDateString()}\nPlease pay before the due date.`,
        severity: 'info',
      });
      const userNotif = await UserNotification.create({
        userId: req.body.userId,
        alertId: alert._id,
        read: false,
        deleted: false,
      });
      userNotifId = userNotif._id || userNotif.id;
    } catch (notifErr) {
      console.log('Rent notification error:', notifErr.message);
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.body.userId}`).emit('notification:received', {
        userNotificationId: userNotifId,
        type: 'payment',
        title: 'House Rent Generated',
        message: `Your monthly house rent has been generated.\nAmount: ₹${req.body.monthlyRent}\nDue Date: ${dueDate.toLocaleDateString()}\nPlease pay before the due date.`,
        severity: 'high',
      });
    }

    const populated = await RentConfig.findById(config._id);
    res.status(201).json({ success: true, message: 'Rent configuration created successfully', data: { config: populated, invoice, payment } });
  } catch (error) {
    logger.error('Create rent config error code:', error.code, 'message:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'A rent configuration already exists for this resident' });
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ success: false, message: 'Invalid user reference — resident does not exist' });
    }
    if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || error.code === 'ER_WARN_DATA_OUT_OF_RANGE') {
      return res.status(400).json({ success: false, message: 'Invalid value for one or more fields (amount, due day, late fee)' });
    }
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ success: false, message: 'Database table not found — please run schema migration (schema.sql)' });
    }
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ success: false, message: 'Database column mismatch — please run schema migration (schema.sql)' });
    }
    res.status(500).json({ success: false, message: `Failed to create rent configuration (${error.code || 'unknown error'})` });
  }
});

router.put('/configs/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const updates = {};
    if (req.body.userId !== undefined) updates.user_id = req.body.userId;
    if (req.body.monthlyRent !== undefined) updates.monthly_rent = req.body.monthlyRent;
    if (req.body.dueDay !== undefined) updates.due_day = req.body.dueDay;
    if (req.body.lateFee !== undefined) updates.late_fee = req.body.lateFee;
    if (req.body.startDate !== undefined) updates.start_date = req.body.startDate;
    if (req.body.isActive !== undefined) updates.is_active = req.body.isActive;

    const updated = await RentConfig.findByIdAndUpdate(req.params.id, updates, { populate: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Config not found' });
    res.json({ success: true, message: 'Rent configuration updated', data: { config: updated } });
  } catch (error) {
    logger.error('Update rent config error:', error);
    res.status(500).json({ success: false, message: 'Failed to update rent configuration' });
  }
});

router.get('/invoices', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, periodMonth } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};
    if (req.user.role === 'resident') filter.residentId = req.userId;
    if (status) filter.status = status;
    if (periodMonth) filter.periodMonth = periodMonth;

    const [invoices, total] = await Promise.all([
      RentInvoice.find(filter, { sort: { createdAt: -1 }, skip, limit: pageLimit, populate: true }),
      RentInvoice.countDocuments(filter),
    ]);

    res.json({ success: true, data: { invoices, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
});

router.get('/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { db } = require('../models/dbHelpers');
    const [totalCollected] = await db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM rent_invoices WHERE status = 'paid'");
    const [pendingRent] = await db.query("SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM rent_invoices WHERE status = 'pending'");
    const [overdueRent] = await db.query("SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM rent_invoices WHERE status = 'overdue'");
    const [monthlyRevenue] = await db.query("SELECT periodMonth AS _id, COALESCE(SUM(amount), 0) AS total FROM rent_invoices WHERE status = 'paid' GROUP BY periodMonth ORDER BY _id DESC LIMIT 12");
    const [totalInvoices] = await db.query("SELECT COUNT(*) AS count FROM rent_invoices");

    res.json({
      success: true,
      data: {
        totalCollected: totalCollected[0]?.total || 0,
        pendingRent: { total: pendingRent[0]?.total || 0, count: pendingRent[0]?.count || 0 },
        overdueRent: { total: overdueRent[0]?.total || 0, count: overdueRent[0]?.count || 0 },
        monthlyRevenue: monthlyRevenue.map(r => ({ _id: r._id, total: r.total })),
        totalInvoices: totalInvoices[0]?.count || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch rent analytics' });
  }
});

module.exports = router;
