const { baseModel } = require('./dbHelpers');
const AuditLog = baseModel('audit_logs', 'id AS _id, userId, action, resource, resourceId, details, ipAddress, userAgent, status, createdAt');
module.exports = AuditLog;
