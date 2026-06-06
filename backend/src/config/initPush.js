const mysql = require('mysql2/promise');
const config = require('../config');

async function createPushTables() {
  const conn = await mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      deviceName VARCHAR(255) DEFAULT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_userId (userId)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL UNIQUE,
      visitorRequests BOOLEAN DEFAULT TRUE,
      visitorApprovals BOOLEAN DEFAULT TRUE,
      maintenanceReminders BOOLEAN DEFAULT TRUE,
      packageArrivals BOOLEAN DEFAULT TRUE,
      emergencyAlerts BOOLEAN DEFAULT TRUE,
      pollsAndVoting BOOLEAN DEFAULT TRUE,
      lostAndFound BOOLEAN DEFAULT TRUE,
      passwordRecovery BOOLEAN DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_userId (userId)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS notification_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      type VARCHAR(100) DEFAULT NULL,
      data JSON DEFAULT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_userId (userId),
      INDEX idx_userId_read (userId, is_read)
    )
  `);

  await conn.end();
  console.log('Push notification tables created');
}

module.exports = createPushTables;
