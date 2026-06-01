const mysql = require('mysql2/promise');
const config = require('./index');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: config.mysql.host,
  port: config.mysql.port,
  user: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

const getConnection = () => pool.getConnection();

const connectDB = async () => {
  try {
    const conn = await pool.getConnection();
    logger.info(`MySQL connected: ${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`);
    conn.release();
    return pool;
  } catch (error) {
    logger.error(`MySQL connection failed: ${error.message}`);
    throw error;
  }
};

module.exports = { pool, query, getConnection, connectDB };
