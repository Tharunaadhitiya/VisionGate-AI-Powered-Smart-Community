const express = require('express');
const { db } = require('../models/dbHelpers');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [visitorStats] = await Promise.all([
      db.query(`SELECT status AS _id, COUNT(*) AS count FROM visitors GROUP BY status`),
    ]);
    const [alertStats] = await Promise.all([
      db.query(`SELECT severity AS _id, COUNT(*) AS count FROM alerts GROUP BY severity`),
    ]);
    const [complaintStats] = await Promise.all([
      db.query(`SELECT status AS _id, COUNT(*) AS count FROM complaints GROUP BY status`),
    ]);
    const [maintenanceStats] = await Promise.all([
      db.query(`SELECT status AS _id, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM maintenance_records GROUP BY status`),
    ]);
    const [residentCountRows] = await Promise.all([
      db.query(`SELECT COUNT(*) AS count FROM users WHERE role = 'resident' AND isActive = true`),
    ]);
    const [todayVisitorsRows] = await Promise.all([
      db.query(`SELECT COUNT(*) AS count FROM visitors WHERE DATE(createdAt) = CURDATE()`),
    ]);
    const [recentAlerts] = await Promise.all([
      db.query(`SELECT id AS _id, type, severity, title, message, status, createdAt FROM alerts ORDER BY createdAt DESC LIMIT 5`),
    ]);
    const [peakHours] = await Promise.all([
      db.query(`SELECT HOUR(checkInTime) AS _id, COUNT(*) AS count FROM visitors WHERE checkInTime IS NOT NULL GROUP BY HOUR(checkInTime) ORDER BY count DESC LIMIT 5`),
    ]);

    res.json({
      success: true,
      data: {
        visitorStats: visitorStats.map(r => ({ _id: r._id, count: r.count })),
        alertStats: alertStats.map(r => ({ _id: r._id, count: r.count })),
        complaintStats: complaintStats.map(r => ({ _id: r._id, count: r.count })),
        maintenanceStats: maintenanceStats.map(r => ({ _id: r._id, count: r.count, total: r.total })),
        residentCount: residentCountRows[0]?.count || 0,
        todayVisitors: todayVisitorsRows[0]?.count || 0,
        recentAlerts: recentAlerts.map(r => ({ ...r, acknowledgedBy: null })),
        peakHours: peakHours.map(r => ({ _id: r._id, count: r.count })),
      },
    });
  } catch (error) {
    logger.error('Dashboard analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

router.get('/security', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    const totalVisitorsRows = await db.query('SELECT COUNT(*) AS count FROM visitors');
    const suspiciousRows = await db.query("SELECT COUNT(*) AS count FROM visitors WHERE isSuspicious = true");
    const emergencyRows = await db.query("SELECT COUNT(*) AS count FROM alerts WHERE isEmergency = true");
    const avgCheckinTime = await db.query("SELECT AVG(TIMESTAMPDIFF(MINUTE, checkInTime, checkOutTime)) AS avg FROM visitors WHERE checkInTime IS NOT NULL AND checkOutTime IS NOT NULL");
    const entryExitRatio = await db.query("SELECT COUNT(*) AS total, SUM(CASE WHEN checkInTime IS NOT NULL THEN 1 ELSE 0 END) AS checkedIn, SUM(CASE WHEN checkOutTime IS NOT NULL THEN 1 ELSE 0 END) AS checkedOut FROM visitors");
    const weeklyTrend = await db.query("SELECT DATE(createdAt) AS _id, COUNT(*) AS count FROM visitors WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(createdAt) ORDER BY _id");

    res.json({
      success: true,
      data: {
        totalVisitors: totalVisitorsRows[0]?.count || 0,
        suspiciousCount: suspiciousRows[0]?.count || 0,
        emergencyCount: emergencyRows[0]?.count || 0,
        avgCheckinTime: avgCheckinTime[0]?.avg || 0,
        entryExitRatio: entryExitRatio[0] || { total: 0, checkedIn: 0, checkedOut: 0 },
        weeklyTrend: weeklyTrend.map(r => ({ _id: r._id, count: r.count })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch security analytics' });
  }
});

router.get('/resident/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? parseInt(req.params.id) : req.userId;

    const visitorsRows = await db.query('SELECT COUNT(*) AS count FROM visitors WHERE residentId = ?', [userId]);
    const complaintsRows = await db.query('SELECT COUNT(*) AS count FROM complaints WHERE residentId = ?', [userId]);
    const maintenanceRows = await db.query('SELECT COUNT(*) AS count FROM maintenance_records WHERE residentId = ?', [userId]);
    const pendingComplaintsRows = await db.query("SELECT COUNT(*) AS count FROM complaints WHERE residentId = ? AND status IN ('submitted','in_progress')", [userId]);
    const pendingMaintRows = await db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM maintenance_records WHERE residentId = ? AND status = 'pending'", [userId]);
    const pendingPaymentRows = await db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE recipientId = ? AND status = 'pending'", [userId]);

    const totalPendingAmount = (pendingMaintRows[0]?.total || 0) + (pendingPaymentRows[0]?.total || 0);

    res.json({
      success: true,
      data: {
        visitors: visitorsRows[0]?.count || 0,
        complaints: complaintsRows[0]?.count || 0,
        maintenance: maintenanceRows[0]?.count || 0,
        alerts: 0,
        pendingComplaints: pendingComplaintsRows[0]?.count || 0,
        pendingMaintenance: totalPendingAmount,
        pendingMaintenanceAmount: totalPendingAmount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch resident analytics' });
  }
});

router.get('/surveillance', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    const totalRows = await db.query('SELECT COUNT(*) AS count FROM alerts');
    const byType = await db.query('SELECT type AS _id, COUNT(*) AS count FROM alerts GROUP BY type');
    const todayRows = await db.query('SELECT COUNT(*) AS count FROM alerts WHERE DATE(createdAt) = CURDATE()');
    const criticalRows = await db.query("SELECT COUNT(*) AS count FROM alerts WHERE severity = 'critical' AND status = 'new'");

    res.json({
      success: true,
      data: {
        totalAlerts: totalRows[0]?.count || 0,
        byType: byType.map(r => ({ _id: r._id, count: r.count })),
        todayAlerts: todayRows[0]?.count || 0,
        criticalAlerts: criticalRows[0]?.count || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch surveillance analytics' });
  }
});

module.exports = router;
