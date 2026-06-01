const express = require('express');
const { body } = require('express-validator');
const AmenityBooking = require('../models/Amenity');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, amenityType, status } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};
    if (req.user.role === 'resident') filter.residentId = req.userId;
    if (amenityType) filter.amenityType = amenityType;
    if (status) filter.status = status;

    const [bookings, total] = await Promise.all([
      AmenityBooking.find(filter, { sort: { createdAt: -1 }, skip, limit: pageLimit, populate: true }),
      AmenityBooking.countDocuments(filter),
    ]);

    res.json({ success: true, data: { bookings, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

router.post('/', authenticate, [
  body('amenityType').isIn(['clubhouse', 'swimming_pool', 'gym', 'tennis_court', 'badminton_court', 'party_hall', 'garden', 'other']),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  body('guests').optional().isInt({ min: 0 }),
], validate, async (req, res) => {
  try {
    const { db } = require('../models/dbHelpers');
    const existing = await AmenityBooking.findOne({
      amenityType: req.body.amenityType,
      date: new Date(req.body.date),
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { startTime: { $lt: req.body.endTime, $gte: req.body.startTime } },
        { endTime: { $gt: req.body.startTime, $lte: req.body.endTime } },
      ],
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Time slot already booked' });
    }

    const booking = await AmenityBooking.create({ ...req.body, residentId: req.userId });
    res.status(201).json({ success: true, message: 'Booking created', data: { booking } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking = await AmenityBooking.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    res.json({ success: true, message: 'Booking cancelled', data: { booking } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

router.put('/:id/confirm', authenticate, authorize('admin'), async (req, res) => {
  try {
    const booking = await AmenityBooking.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed', approvedBy: req.userId },
      { new: true }
    );
    res.json({ success: true, message: 'Booking confirmed', data: { booking } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to confirm booking' });
  }
});

module.exports = router;
