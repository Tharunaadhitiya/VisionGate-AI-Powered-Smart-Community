const express = require('express');
const { db } = require('../models/dbHelpers');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/admin-dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [
      residentRows, todayVisitorRows, alertTotalRows, alertGroupRows,
      compTotalRows, compGroupRows, maintRows, pkgRows, incidentRows,
      noticeRows, pollRows, recoveryRows, lostRows, foundRows,
      paidRevenueRows, pendingRevenueRows, recentAlertRows, peakHourRows,
      yesterdayVisitorRows, yesterdayAlertRows, yesterdayComplaintRows,
      visitorGroupRows,
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) AS count FROM users WHERE role = 'resident' AND isActive = true`),
      db.query(`SELECT COUNT(*) AS count FROM visitors WHERE DATE(createdAt) = CURDATE()`),
      db.query(`SELECT COUNT(*) AS count FROM alerts`),
      db.query(`SELECT severity AS _id, COUNT(*) AS count FROM alerts GROUP BY severity`),
      db.query(`SELECT COUNT(*) AS count FROM complaints`),
      db.query(`SELECT status AS _id, COUNT(*) AS count FROM complaints GROUP BY status`),
      db.query(`SELECT status AS _id, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM maintenance_records GROUP BY status`),
      db.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN DATE(createdAt) = CURDATE() THEN 1 ELSE 0 END) AS today, SUM(CASE WHEN status IN ('received','ready') THEN 1 ELSE 0 END) AS pending FROM packages`),
      db.query(`SELECT COUNT(*) AS total FROM incidents`),
      db.query(`SELECT COUNT(*) AS count FROM notices WHERE isActive = true`),
      db.query(`SELECT COUNT(*) AS count FROM polls WHERE isActive = true`),
      db.query(`SELECT COUNT(*) AS count FROM account_recovery WHERE status = 'pending'`),
      db.query(`SELECT COUNT(*) AS count FROM lost_items`),
      db.query(`SELECT COUNT(*) AS count FROM found_items`),
      db.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'paid'`),
      db.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status IN ('pending','overdue')`),
      db.query(`SELECT id AS _id, type, severity, title, message, status, createdAt FROM alerts ORDER BY createdAt DESC LIMIT 5`),
      db.query(`SELECT HOUR(checkInTime) AS _id, COUNT(*) AS count FROM visitors WHERE checkInTime IS NOT NULL GROUP BY HOUR(checkInTime) ORDER BY count DESC LIMIT 5`),
      db.query(`SELECT COUNT(*) AS count FROM visitors WHERE DATE(createdAt) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`),
      db.query(`SELECT COUNT(*) AS count FROM alerts WHERE DATE(createdAt) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`),
      db.query(`SELECT COUNT(*) AS count FROM complaints WHERE DATE(createdAt) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`),
      db.query(`SELECT status AS _id, COUNT(*) AS count FROM visitors GROUP BY status`),
    ]);

    const todayVisitors = todayVisitorRows[0]?.count || 0;
    const yesterdayVisitors = yesterdayVisitorRows[0]?.count || 0;
    const visitorTrend = yesterdayVisitors > 0 ? Math.round(((todayVisitors - yesterdayVisitors) / yesterdayVisitors) * 100) : 0;
    const totalAlerts = alertTotalRows[0]?.count || 0;
    const yesterdayAlerts = yesterdayAlertRows[0]?.count || 0;
    const alertTrend = yesterdayAlerts > 0 ? Math.round(((totalAlerts - yesterdayAlerts) / yesterdayAlerts) * 100) : 0;
    const totalComplaints = compTotalRows[0]?.count || 0;
    const yesterdayComplaints = yesterdayComplaintRows[0]?.count || 0;
    const complaintTrend = yesterdayComplaints > 0 ? Math.round(((totalComplaints - yesterdayComplaints) / yesterdayComplaints) * 100) : 0;

    const packages = pkgRows[0] || { total: 0, today: 0, pending: 0 };

    res.json({
      success: true,
      data: {
        residentCount: residentRows[0]?.count || 0,
        todayVisitors,
        visitorTrend,
        totalAlerts,
        alertTrend,
        totalComplaints,
        complaintTrend,
        totalPackages: packages.total,
        packagesToday: packages.today,
        packagesPending: packages.pending,
        totalIncidents: incidentRows[0]?.total || 0,
        activeNotices: noticeRows[0]?.count || 0,
        activePolls: pollRows[0]?.count || 0,
        pendingRecovery: recoveryRows[0]?.count || 0,
        totalLost: lostRows[0]?.count || 0,
        totalFound: foundRows[0]?.count || 0,
        totalRevenue: paidRevenueRows[0]?.total || 0,
        pendingRevenue: pendingRevenueRows[0]?.total || 0,
        visitorStats: visitorGroupRows.map(r => ({ _id: r._id, count: r.count })),
        alertStats: alertGroupRows.map(r => ({ _id: r._id, count: r.count })),
        complaintStats: compGroupRows.map(r => ({ _id: r._id, count: r.count })),
        maintenanceStats: maintRows.map(r => ({ _id: r._id, count: r.count, total: r.total })),
        recentAlerts: recentAlertRows.map(r => ({ ...r, acknowledgedBy: null })),
        peakHours: peakHourRows.map(r => ({ _id: r._id, count: r.count })),
      },
    });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin dashboard' });
  }
});

router.get('/security-dashboard', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    const [
      totalVisitorsRows, activeVisitorRows, suspiciousRows, emergencyRows,
      alertTotalRows, alertTodayRows, incidentRows, pendingVisitorRows,
      pkgTodayRows, survTotalRows, survTodayRows, lostRows,
      humanDetectRows, vehicleDetectRows, entryExitRows, weeklyTrendRows,
      yesterdayVisitorRows, yesterdaySuspiciousRows,
    ] = await Promise.all([
      db.query('SELECT COUNT(*) AS count FROM visitors'),
      db.query("SELECT COUNT(*) AS count FROM visitors WHERE status = 'entered'"),
      db.query("SELECT COUNT(*) AS count FROM visitors WHERE isSuspicious = true"),
      db.query("SELECT COUNT(*) AS count FROM alerts WHERE isEmergency = true"),
      db.query("SELECT COUNT(*) AS count FROM alerts"),
      db.query("SELECT COUNT(*) AS count FROM alerts WHERE DATE(createdAt) = CURDATE()"),
      db.query("SELECT COUNT(*) AS count FROM incidents"),
      db.query("SELECT COUNT(*) AS count FROM visitors WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) AS count FROM packages WHERE DATE(createdAt) = CURDATE()"),
      db.query("SELECT COUNT(*) AS count FROM alerts WHERE type LIKE 'surveillance%' OR type LIKE 'mobile_detection%'"),
      db.query("SELECT COUNT(*) AS count FROM alerts WHERE (type LIKE 'surveillance%' OR type LIKE 'mobile_detection%') AND DATE(createdAt) = CURDATE()"),
      db.query("SELECT COUNT(*) AS count FROM lost_items WHERE status = 'open'"),
      db.query("SELECT COUNT(*) AS count FROM alerts WHERE type = 'mobile_detection_human'"),
      db.query("SELECT COUNT(*) AS count FROM alerts WHERE type = 'mobile_detection_vehicle'"),
      db.query("SELECT COUNT(*) AS total, SUM(CASE WHEN checkInTime IS NOT NULL THEN 1 ELSE 0 END) AS checkedIn, SUM(CASE WHEN checkOutTime IS NOT NULL THEN 1 ELSE 0 END) AS checkedOut FROM visitors"),
      db.query("SELECT DATE(createdAt) AS _id, COUNT(*) AS count FROM visitors WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(createdAt) ORDER BY _id"),
      db.query("SELECT COUNT(*) AS count FROM visitors WHERE DATE(createdAt) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"),
      db.query("SELECT COUNT(*) AS count FROM visitors WHERE isSuspicious = true AND DATE(createdAt) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"),
    ]);

    const today = totalVisitorsRows[0]?.count || 0;
    const yesterday = yesterdayVisitorRows[0]?.count || 0;
    const visitorTrend = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : 0;
    const suspToday = suspiciousRows[0]?.count || 0;
    const suspYesterday = yesterdaySuspiciousRows[0]?.count || 0;
    const suspTrend = suspYesterday > 0 ? Math.round(((suspToday - suspYesterday) / suspYesterday) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalVisitors: totalVisitorsRows[0]?.count || 0,
        visitorTrend,
        activeVisitors: activeVisitorRows[0]?.count || 0,
        suspiciousCount: suspiciousRows[0]?.count || 0,
        suspiciousTrend: suspTrend,
        emergencyCount: emergencyRows[0]?.count || 0,
        totalAlerts: alertTotalRows[0]?.count || 0,
        alertsToday: alertTodayRows[0]?.count || 0,
        totalIncidents: incidentRows[0]?.count || 0,
        pendingApprovals: pendingVisitorRows[0]?.count || 0,
        packagesToday: pkgTodayRows[0]?.count || 0,
        surveillanceEvents: survTotalRows[0]?.count || 0,
        surveillanceEventsToday: survTodayRows[0]?.count || 0,
        openLostItems: lostRows[0]?.count || 0,
        humanDetections: humanDetectRows[0]?.count || 0,
        vehicleDetections: vehicleDetectRows[0]?.count || 0,
        avgCheckinTime: 0,
        entryExitRatio: entryExitRows[0] || { total: 0, checkedIn: 0, checkedOut: 0 },
        weeklyTrend: weeklyTrendRows.map(r => ({ _id: r._id, count: r.count })),
      },
    });
  } catch (error) {
    logger.error('Security dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch security analytics' });
  }
});

router.get('/resident-dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const [
      visitorsRows, complaintsRows, pendingCompRows, maintenanceRows,
      pendingMaintRows, pendingPayRows, pkgRows, lostRows,
      foundRows, notifRows, pollVoteRows,
    ] = await Promise.all([
      db.query('SELECT COUNT(*) AS count FROM visitors WHERE residentId = ?', [userId]),
      db.query('SELECT COUNT(*) AS count FROM complaints WHERE residentId = ?', [userId]),
      db.query("SELECT COUNT(*) AS count FROM complaints WHERE residentId = ? AND status IN ('submitted','in_progress')", [userId]),
      db.query('SELECT COUNT(*) AS count FROM maintenance_records WHERE residentId = ?', [userId]),
      db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM maintenance_records WHERE residentId = ? AND status = 'pending'", [userId]),
      db.query("SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM payments WHERE recipientId = ? AND status = 'pending'", [userId]),
      db.query('SELECT COUNT(*) AS count FROM packages WHERE residentId = ?', [userId]),
      db.query('SELECT COUNT(*) AS count FROM lost_items WHERE reportedBy = ?', [userId]),
      db.query('SELECT COUNT(*) AS count FROM found_items WHERE reportedBy = ?', [userId]),
      db.query("SELECT COUNT(*) AS count FROM user_notifications WHERE userId = ? AND isRead = false", [userId]),
      db.query('SELECT COUNT(DISTINCT pollId) AS count FROM poll_votes WHERE userId = ?', [userId]),
    ]);

    const pendingMaintAmount = pendingMaintRows[0]?.total || 0;
    const pendingPayAmount = pendingPayRows[0]?.total || 0;
    const pendingPayCount = pendingPayRows[0]?.count || 0;

    res.json({
      success: true,
      data: {
        visitors: visitorsRows[0]?.count || 0,
        complaints: complaintsRows[0]?.count || 0,
        pendingComplaints: pendingCompRows[0]?.count || 0,
        maintenance: maintenanceRows[0]?.count || 0,
        pendingMaintenance: pendingMaintAmount + pendingPayAmount,
        packages: pkgRows[0]?.count || 0,
        lostItems: lostRows[0]?.count || 0,
        foundItems: foundRows[0]?.count || 0,
        unreadNotifications: notifRows[0]?.count || 0,
        pollParticipation: pollVoteRows[0]?.count || 0,
        pendingPayments: pendingPayCount,
        pendingPaymentsAmount: pendingPayAmount,
      },
    });
  } catch (error) {
    logger.error('Resident dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch resident dashboard' });
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
