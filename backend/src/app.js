const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const visitorRoutes = require('./routes/visitors');
const complaintRoutes = require('./routes/complaints');
const alertRoutes = require('./routes/alerts');
const maintenanceRoutes = require('./routes/maintenance');
const amenityRoutes = require('./routes/amenities');
const analyticsRoutes = require('./routes/analytics');
const surveillanceRoutes = require('./routes/surveillance');
const aiRoutes = require('./routes/ai');
const notificationRoutes = require('./routes/notifications');
const userNotificationRoutes = require('./routes/userNotifications');
const chatRoutes = require('./routes/chat');
const paymentRoutes = require('./routes/payments');
const recommendationRoutes = require('./routes/recommendations');
const noticeRoutes = require('./routes/notices');
const pollRoutes = require('./routes/polls');
const incidentRoutes = require('./routes/incidents');
const searchRoutes = require('./routes/search');
const houseRoutes = require('./routes/houses');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: function (origin, callback) { callback(null, true); }, credentials: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10000, message: { success: false, message: 'Too many requests' } });
app.use('/api/', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/surveillance', surveillanceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user-notifications', userNotificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/houses', houseRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'VisionGate API is running', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

module.exports = app;
