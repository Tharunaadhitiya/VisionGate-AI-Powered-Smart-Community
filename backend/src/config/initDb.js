const mysql = require('mysql2/promise');
const config = require('./index');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const createPushTables = require('./initPush');

const initDatabase = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      multipleStatements: true,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${config.mysql.database}\``);

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const statements = schema.split(';').filter((s) => s.trim().length > 0);
      for (const stmt of statements) {
        if (stmt.toUpperCase().includes('CREATE DATABASE') || stmt.toUpperCase().includes('USE ')) continue;
        try {
          await connection.query(stmt);
        } catch (err) {
          if (err.errno !== 1050) {
            logger.warn(`Schema statement warning: ${err.message}`);
          }
        }
      }
      logger.info('Database schema initialized');
    }

    await createPushTables();
    logger.info(`Database "${config.mysql.database}" ready`);
    return true;
  } catch (error) {
    logger.error(`Database init error: ${error.message}`);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
};

module.exports = initDatabase;
