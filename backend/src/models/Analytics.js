const { baseModel } = require('./dbHelpers');
const Analytics = baseModel('analytics', 'id AS _id, date, type, data, total, approved, rejected, suspicious, pending, resolved, averageTime, peakHour, createdAt');
module.exports = Analytics;
