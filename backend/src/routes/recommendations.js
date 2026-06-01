const express = require('express');
const { authenticate } = require('../middleware/auth');
const Complaint = require('../models/Complaint');
const Visitor = require('../models/Visitor');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.userId;
    const recommendations = [];

    if (role === 'resident') {
      const [pendingVisitors, pendingComplaints, pendingPayments, activeAlerts] = await Promise.all([
        Visitor.countDocuments({ residentId: userId, status: 'pending' }),
        Complaint.countDocuments({ residentId: userId, status: { $in: ['submitted', 'in_progress'] } }),
        Payment.countDocuments({ recipientId: userId, status: 'pending' }),
        Alert.countDocuments({ isEmergency: true, status: 'new' }),
      ]);

      if (pendingVisitors > 0) recommendations.push({ type: 'visitor', icon: 'UserPlus', title: `${pendingVisitors} visitor${pendingVisitors > 1 ? 's' : ''} awaiting approval`, priority: 'high', action: 'View Visitors', link: '/visitors' });
      if (pendingPayments > 0) recommendations.push({ type: 'payment', icon: 'CreditCard', title: `You have ${pendingPayments} pending payment${pendingPayments > 1 ? 's' : ''}`, priority: 'high', action: 'Pay Now', link: '/dashboard' });
      if (pendingComplaints > 0) recommendations.push({ type: 'complaint', icon: 'FileText', title: `${pendingComplaints} open complaint${pendingComplaints > 1 ? 's' : ''} in progress`, priority: 'medium', action: 'View Complaints', link: '/complaints' });
      if (activeAlerts > 0) recommendations.push({ type: 'alert', icon: 'AlertTriangle', title: `${activeAlerts} active alert${activeAlerts > 1 ? 's' : ''} require attention`, priority: 'emergency', action: 'View Alerts', link: '/dashboard/alerts' });

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const maintenanceDue = await Payment.countDocuments({ recipientId: userId, status: 'pending', type: 'maintenance' });
      if (maintenanceDue > 0) recommendations.push({ type: 'maintenance', icon: 'Calendar', title: `Maintenance fee due this month`, priority: 'medium', action: 'Pay Maintenance', link: '/dashboard' });
    } else if (role === 'security') {
      const [todayVisitors, activeAlerts, suspiciousCount] = await Promise.all([
        Visitor.countDocuments({ status: { $in: ['pending', 'checked_in'] } }),
        Alert.countDocuments({ status: 'new', severity: { $in: ['high', 'critical'] } }),
        Visitor.countDocuments({ isSuspicious: true, status: 'checked_in' }),
      ]);

      if (todayVisitors > 0) recommendations.push({ type: 'visitor', icon: 'Users', title: `${todayVisitors} active visitor${todayVisitors > 1 ? 's' : ''} on premises`, priority: 'high', action: 'Manage Visitors', link: '/visitors' });
      if (activeAlerts > 0) recommendations.push({ type: 'alert', icon: 'AlertTriangle', title: `${activeAlerts} critical alert${activeAlerts > 1 ? 's' : ''} require acknowledgment`, priority: 'emergency', action: 'View Alerts', link: '/dashboard/alerts' });
      if (suspiciousCount > 0) recommendations.push({ type: 'suspicious', icon: 'ShieldAlert', title: `${suspiciousCount} suspicious entr${suspiciousCount > 1 ? 'ies' : 'y'} detected today`, priority: 'high', action: 'Review', link: '/visitors' });

      const hour = new Date().getHours();
      if ((hour >= 8 && hour <= 10) || (hour >= 16 && hour <= 18)) {
        recommendations.push({ type: 'traffic', icon: 'Car', title: 'High visitor traffic expected during peak hours', priority: 'medium', action: 'Prepare', link: '/dashboard' });
      }
    } else if (role === 'admin') {
      const [criticalComplaints, pendingAlerts, pendingVisitors, totalUsers, overduePayments] = await Promise.all([
        Complaint.countDocuments({ status: { $in: ['submitted', 'in_progress'] }, priority: { $in: ['high', 'critical'] } }),
        Alert.countDocuments({ status: 'new' }),
        Visitor.countDocuments({ status: 'pending' }),
        User.countDocuments({ isActive: true }),
        Payment.countDocuments({ status: 'pending' }),
      ]);

      if (criticalComplaints > 0) recommendations.push({ type: 'complaint', icon: 'AlertCircle', title: `${criticalComplaints} critical complaint${criticalComplaints > 1 ? 's' : ''} require attention`, priority: 'emergency', action: 'View Complaints', link: '/complaints' });
      if (pendingAlerts > 0) recommendations.push({ type: 'alert', icon: 'AlertTriangle', title: `${pendingAlerts} unacknowledged alert${pendingAlerts > 1 ? 's' : ''}`, priority: 'high', action: 'View Alerts', link: '/dashboard/alerts' });
      if (pendingVisitors > 0) recommendations.push({ type: 'visitor', icon: 'UserPlus', title: `${pendingVisitors} visitor${pendingVisitors > 1 ? 's' : ''} pending approval`, priority: 'medium', action: 'Manage Visitors', link: '/visitors' });
      if (overduePayments > 0) recommendations.push({ type: 'payment', icon: 'CreditCard', title: `${overduePayments} payment${overduePayments > 1 ? 's' : ''} pending collection`, priority: 'medium', action: 'Review Payments', link: '/dashboard' });

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [recentRegistrations, recentAlerts] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: weekAgo } }),
        Alert.countDocuments({ createdAt: { $gte: weekAgo } }),
      ]);
      if (recentRegistrations > 0) recommendations.push({ type: 'growth', icon: 'TrendingUp', title: `${recentRegistrations} new user${recentRegistrations > 1 ? 's' : ''} joined this week`, priority: 'low', action: 'View Directory', link: '/dashboard' });
      if (recentAlerts > 5) recommendations.push({ type: 'trend', icon: 'Activity', title: `Unusually high alert volume (${recentAlerts}) this week`, priority: 'high', action: 'Investigate', link: '/dashboard/alerts' });
    }

    recommendations.sort((a, b) => {
      const prioMap = { emergency: 0, high: 1, medium: 2, low: 3 };
      return (prioMap[a.priority] || 99) - (prioMap[b.priority] || 99);
    });

    res.json({ success: true, data: { recommendations } });
  } catch (error) {
    logger.error('Recommendations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recommendations' });
  }
});

module.exports = router;
