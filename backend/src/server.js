const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config');
const { connectDB } = require('./config/db');
const initDatabase = require('./config/initDb');
const setupSocketHandlers = require('./websocket/socketHandler');
const logger = require('./utils/logger');

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

const server = http.createServer(app);

let portRetries = 0;
const MAX_PORT_RETRIES = 3;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    portRetries++;
    if (portRetries > MAX_PORT_RETRIES) {
      logger.error(`Port ${config.port} is in use after ${MAX_PORT_RETRIES} retries. Exiting.`);
      process.exit(1);
    }
    logger.error(`Port ${config.port} is already in use. Retrying in 3 seconds... (attempt ${portRetries}/${MAX_PORT_RETRIES})`);
    setTimeout(() => {
      server.close();
      server.listen(config.port);
    }, 3000);
  } else {
    logger.error('Server error:', err);
  }
});

const io = new Server(server, {
  cors: { origin: (origin, callback) => callback(null, true), credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

setupSocketHandlers(io);

app.set('io', io);

const startServer = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await connectDB();
      await initDatabase();
      break;
    } catch (error) {
      logger.error(`MySQL connection failed (attempt ${attempt}/${retries}): ${error.message}`);
      if (attempt === retries) {
        logger.error('All MySQL connection attempts failed. Retrying in 10 seconds...');
        setTimeout(() => startServer(retries), 10000);
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  server.listen(config.port, () => {
    logger.info(`VisionGate server running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`API: http://localhost:${config.port}/api/health`);
  });
};

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  io.close(() => logger.info('Socket.IO closed'));
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => { logger.error('Forced shutdown'); process.exit(1); }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

module.exports = { app, server, io };
