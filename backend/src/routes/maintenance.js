const express = require('express');
const { body } = require('express-validator');
const Maintenance = require('../models/Maintenance');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const { db } = require('../models/dbHelpers');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};
    if (req.user.role === 'resident') filter.residentId = req.userId;
    if (status) filter.status = status;

    const [records, total] = await Promise.all([
      Maintenance.find(filter, { sort: { dueDate: -1 }, skip, limit: pageLimit, populate: true }),
      Maintenance.countDocuments(filter),
    ]);

    res.json({ success: true, data: { records, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch maintenance records' });
  }
});

router.post('/', authenticate, [
  body('amount').isNumeric().withMessage('Amount is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('period').optional().isIn(['monthly', 'quarterly', 'yearly']),
  body('month').optional().isInt({ min: 1, max: 12 }),
  body('year').optional().isInt(),
], validate, async (req, res) => {
  try {
    const record = await Maintenance.create({ ...req.body, residentId: req.userId });
    res.status(201).json({ success: true, message: 'Maintenance record created', data: { record } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create record' });
  }
});

router.put('/:id/pay', authenticate, [
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'upi', 'net_banking']),
  body('transactionId').optional().trim(),
], validate, async (req, res) => {
  try {
    const record = await Maintenance.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paymentMethod: req.body.paymentMethod, transactionId: req.body.transactionId, paidAt: new Date() },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Payment successful', data: { record } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payment failed' });
  }
});

router.get('/summary', authenticate, async (req, res) => {
  try {
    const match = req.user.role === 'resident' ? { residentId: req.user._id } : {};
    const [totalDueResult, totalPaidResult, pending, overdue] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM maintenance_records WHERE status = 'pending'${match.residentId ? ' AND residentId = ?' : ''}`, match.residentId ? [match.residentId] : []),
      db.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM maintenance_records WHERE status = 'paid'${match.residentId ? ' AND residentId = ?' : ''}`, match.residentId ? [match.residentId] : []),
      Maintenance.countDocuments({ ...match, status: 'pending' }),
      Maintenance.countDocuments({ ...match, status: 'overdue' }),
    ]);

    res.json({
      success: true,
      data: { totalDue: totalDueResult[0]?.total || 0, totalPaid: totalPaidResult[0]?.total || 0, pending, overdue },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

module.exports = router;
