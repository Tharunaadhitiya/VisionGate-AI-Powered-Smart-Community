const express = require('express');
const { body } = require('express-validator');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const UserNotification = require('../models/UserNotification');
const House = require('../models/House');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginateResults } = require('../utils/helpers');
const logger = require('../utils/logger');
const { notifyUser, notifyAllSecurity } = require('../services/notificationHelper');

const router = express.Router();

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', entered: 'Entered', exited: 'Exited' };

router.get('/towers', authenticate, async (req, res) => {
  try {
    logger.info('[GET /visitors/towers] Loading towers from registered residents...');
    const towers = await House.getTowers();
    const result = towers.map((t) => ({ tower: t }));
    logger.info(`[GET /visitors/towers] Towers found: ${result.length ? result.map(r => r.tower).join(',') : 'none'}`);
    res.json({ success: true, data: { towers: result } });
  } catch (error) {
    logger.error('[GET /visitors/towers] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load towers' });
  }
});

router.get('/flats/:tower', authenticate, async (req, res) => {
  try {
    const { tower } = req.params;
    logger.info(`[GET /visitors/flats/${tower}] Loading flats...`);
    const flats = await House.getFlatsByTower(tower);
    const result = flats.map((f) => ({
      id: f._id,
      house_code: f.houseCode,
      flat_number: f.flatNumber,
      resident_id: f.residentId,
    }));
    logger.info(`[GET /visitors/flats/${tower}] ${result.length} flats found: ${result.map(r => r.house_code).join(',') || 'none'}`);
    res.json({ success: true, data: { flats: result } });
  } catch (error) {
    logger.error(`[GET /visitors/flats/:tower] Error:`, error);
    res.status(500).json({ success: false, message: 'Failed to load flats' });
  }
});

router.get('/resident/:houseCode', authenticate, async (req, res) => {
  try {
    const { houseCode } = req.params;
    logger.info(`[GET /visitors/resident/${houseCode}] Looking up resident...`);
    const residents = await User.find({ role: 'resident', houseCode });
    if (residents.length === 0) {
      logger.warn(`[GET /visitors/resident/${houseCode}] No resident found`);
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }
    const r = residents[0];
    const result = {
      name: r.name,
      email: r.email,
      phone: r.phone,
      tower: r.tower,
      flat_number: r.flatNumber,
      house_code: r.houseCode,
    };
    logger.info(`[GET /visitors/resident/${houseCode}] Found: ${r.name}`);
    res.json({ success: true, data: { resident: result } });
  } catch (error) {
    logger.error(`[GET /visitors/resident/:houseCode] Error:`, error);
    res.status(500).json({ success: false, message: 'Failed to load resident details' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate, residentId } = req.query;
    const { skip, limit: pageLimit } = paginateResults(page, limit);
    const filter = {};

    if (residentId) filter.residentId = residentId;
    else if (req.user.role === 'resident') filter.residentId = req.userId;
    if (req.user.role === 'security') filter.securityId = req.userId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [visitors, total] = await Promise.all([
      Visitor.find(filter, { sort: { createdAt: -1 }, skip, limit: pageLimit, populate: true }),
      Visitor.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { visitors, total, page: parseInt(page), pages: Math.ceil(total / pageLimit) },
    });
  } catch (error) {
    logger.error('Get visitors error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch visitors' });
  }
});

router.post('/', authenticate, authorize('security'), [
  body('name').trim().notEmpty().withMessage('Visitor name is required'),
  body('phone').trim().notEmpty().withMessage('Visitor phone is required'),
  body('purpose').optional().isIn(['personal', 'delivery', 'service', 'emergency', 'other']),
  body('houseId').trim().notEmpty().withMessage('House selection is required'),
  body('vehicleNumber').optional().trim(),
  body('vehicleType').optional().isIn(['bike', 'car', 'auto', 'taxi', 'delivery_vehicle', 'other']),
  body('idProof').optional().trim(),
], validate, async (req, res) => {
  try {
    const house = await House.findById(req.body.houseId);
    if (!house) {
      return res.status(400).json({ success: false, message: 'Selected house does not exist' });
    }
    if (!house.residentId) {
      return res.status(400).json({ success: false, message: 'Selected house has no resident assigned' });
    }

    const residentUser = await User.findById(house.residentId);
    if (!residentUser) {
      return res.status(400).json({ success: false, message: 'Resident not found for this house' });
    }

    const visitor = await Visitor.create({
      name: req.body.name,
      phone: req.body.phone,
      purpose: req.body.purpose || 'personal',
      vehicleNumber: req.body.vehicleNumber || '',
      description: req.body.description || '',
      houseCode: house.houseCode,
      residentId: residentUser._id,
      securityId: req.userId,
      status: 'pending',
    });

    const io = req.app.get('io');

    try {
      await UserNotification.create({
        userId: residentUser._id,
        alertId: null,
        read: false,
        deleted: false,
      });
      if (io) {
        io.to(`user:${residentUser._id}`).emit('notification:received', {
          type: 'visitor_request',
          title: 'Visitor Entry Request',
          message: `Visitor: ${visitor.name}, Purpose: ${visitor.purpose}, Time: ${new Date().toLocaleTimeString()}, Requested By: Security Gate`,
          severity: 'info',
          visitorId: visitor._id,
          houseCode: house.houseCode,
          residentName: residentUser.name,
        });
      }
      await notifyUser(io, residentUser._id, {
        type: 'visitorRequests',
        title: 'Visitor Entry Request',
        body: `Visitor: ${visitor.name}, Purpose: ${visitor.purpose}`,
        data: { url: '/visitors', visitorId: visitor._id, severity: 'info' },
      });
    } catch (notifErr) {
      logger.warn('Resident notification error:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Entry request sent to ${residentUser.name} at ${house.houseCode}`,
      data: { visitor },
    });
  } catch (error) {
    logger.error('Create visitor error:', error);
    res.status(500).json({ success: false, message: 'Failed to create visitor request' });
  }
});

router.put('/:id/respond', authenticate, authorize('resident'), [
  body('action').isIn(['approved', 'rejected']),
], validate, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor request not found' });
    if (visitor.residentId !== req.userId) return res.status(403).json({ success: false, message: 'This request is not for you' });
    if (visitor.status !== 'pending') return res.status(400).json({ success: false, message: `Request already ${visitor.status}` });

    const action = req.body.action;
    const update = { status: action };
    if (action === 'approved') update.approvedBy = req.userId;
    update.approvalTime = new Date();

    const updated = await Visitor.findByIdAndUpdate(visitor._id, update, { populate: true });

    const io = req.app.get('io');
    try {
      if (visitor.securityId) {
        await UserNotification.create({
          userId: visitor.securityId,
          alertId: null,
          read: false,
          deleted: false,
        });
      }
      if (io) {
        const resident = req.user;
        const message = action === 'approved'
          ? `Visitor Approved. Resident: ${resident.name}, House: ${visitor.houseCode}, Status: Approved. Allow Entry.`
          : `Visitor Rejected. Resident: ${resident.name}, House: ${visitor.houseCode}, Status: Rejected. Do Not Allow Entry.`;

        io.to(`user:${visitor.securityId}`).emit('notification:received', {
          type: 'visitor_response',
          title: action === 'approved' ? 'Visitor Approved' : 'Visitor Rejected',
          message,
          severity: action === 'approved' ? 'success' : 'warning',
          visitorId: visitor._id,
          action,
          residentName: resident.name,
          houseCode: visitor.houseCode,
        });
      }
      if (visitor.securityId) {
        await notifyUser(io, visitor.securityId, {
          type: 'visitorApprovals',
          title: action === 'approved' ? 'Visitor Approved' : 'Visitor Rejected',
          body: `Resident: ${req.user.name}, House: ${visitor.houseCode}, Status: ${action}`,
          data: { url: '/visitors', visitorId: visitor._id, severity: action === 'approved' ? 'success' : 'warning' },
        });
      }
    } catch (notifErr) {
      logger.warn('Security notification error:', notifErr.message);
    }

    res.json({
      success: true,
      message: `Visitor request ${action}`,
      data: { visitor: updated },
    });
  } catch (error) {
    logger.error('Respond to visitor error:', error);
    res.status(500).json({ success: false, message: 'Failed to respond to request' });
  }
});

router.put('/:id/enter', authenticate, authorize('security'), async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });
    if (visitor.status !== 'approved') return res.status(400).json({ success: false, message: 'Visitor has not been approved' });

    const updated = await Visitor.findByIdAndUpdate(visitor._id, { status: 'entered', entryTime: new Date(), checkedInBy: req.userId }, { populate: true });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${visitor.residentId}`).emit('notification:received', {
        type: 'visitor_entry',
        title: 'Visitor Entered',
        message: `${visitor.name} has entered the premises`,
        severity: 'info',
        visitorId: visitor._id,
      });
    }

    res.json({ success: true, message: 'Visitor entry recorded', data: { visitor: updated } });
  } catch (error) {
    logger.error('Visitor entry error:', error);
    res.status(500).json({ success: false, message: 'Failed to record entry' });
  }
});

router.put('/:id/exit', authenticate, authorize('security'), async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });
    if (visitor.status !== 'entered') return res.status(400).json({ success: false, message: 'Visitor has not entered yet' });

    const updated = await Visitor.findByIdAndUpdate(visitor._id, {
      status: 'exited',
      exitTime: new Date(),
      checkOutTime: new Date(),
      visitCount: (visitor.visitCount || 0) + 1,
    }, { populate: true });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${visitor.residentId}`).emit('notification:received', {
        type: 'visitor_exit',
        title: 'Visitor Exited',
        message: `${visitor.name} has exited the premises`,
        severity: 'info',
        visitorId: visitor._id,
      });
    }

    res.json({ success: true, message: 'Visitor exit recorded', data: { visitor: updated } });
  } catch (error) {
    logger.error('Visitor exit error:', error);
    res.status(500).json({ success: false, message: 'Failed to record exit' });
  }
});

router.get('/summary', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [total, byStatus, todayCount] = await Promise.all([
      Visitor.countDocuments({}),
      (async () => {
        const rows = await Visitor.aggregate([
          { $match: {} },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        return rows;
      })(),
      (async () => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return Visitor.countDocuments({ createdAt: { $gte: today } });
      })(),
    ]);

    const stats = { pending: 0, approved: 0, rejected: 0, entered: 0, exited: 0 };
    for (const s of byStatus) stats[s._id] = s.count;

    res.json({ success: true, data: { total, ...stats, todayCount } });
  } catch (error) {
    logger.error('Visitor summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });
    res.json({ success: true, data: { visitor } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch visitor' });
  }
});

module.exports = router;
