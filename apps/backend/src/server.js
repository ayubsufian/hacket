// =============================================================================
// HackET Platform — Express Server Entry Point
// =============================================================================

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

// ── Config ──────────────────────────────────────────────────────────────
const prisma = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');

// ── Middleware ───────────────────────────────────────────────────────────
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');

// ── Routes ──────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const eventsRoutes = require('./routes/events.routes');
const teamsRoutes = require('./routes/teams.routes');
const submissionsRoutes = require('./routes/submissions.routes');
const judgingRoutes = require('./routes/judging.routes');
const matchingRoutes = require('./routes/matching.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const analyticsRoutes = require('./routes/analytics.routes');

// ── Initialize Services (registers EventBus listeners) ──────────────────
require('./services/audit/audit.service');
require('./services/notifications/notification.service');

// =============================================================================
// APP SETUP
// =============================================================================

const app = express();
const PORT = process.env.PORT || 5000;
const API_PREFIX = '/api/v1';

// ── Security & Parsing ──────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow any localhost origin for development
      if (origin.match(/^http:\/\/localhost:\d+$/)) {
        return callback(null, true);
      }
      if (origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Static Files (uploads) ──────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Health Check ────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HackET API is running.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ──────────────────────────────────────────────────────────
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/events`, eventsRoutes);
app.use(`${API_PREFIX}/teams`, teamsRoutes);
app.use(`${API_PREFIX}/submissions`, submissionsRoutes);
app.use(`${API_PREFIX}/judging`, judgingRoutes);
app.use(`${API_PREFIX}/matching`, matchingRoutes);
app.use(`${API_PREFIX}/notifications`, notificationsRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);

// ── 404 Handler ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found.`, 404));
});

// ── Global Error Handler ────────────────────────────────────────────────
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();
    console.log('[Server] Redis connected.');

    // Verify Prisma connection
    await prisma.$connect();
    console.log('[Server] Database connected.');

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 HackET API Server                                    ║
║   ─────────────────────────────────────────                ║
║   Environment : ${(process.env.NODE_ENV || 'development').padEnd(40)}║
║   Port        : ${String(PORT).padEnd(40)}║
║   API Base    : http://localhost:${PORT}${API_PREFIX.padEnd(23)}║
║   Health      : http://localhost:${PORT}/health${' '.repeat(18)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    // ── Graceful Shutdown ───────────────────────────────────────────────
    const gracefulShutdown = async (signal) => {
      console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        try {
          await prisma.$disconnect();
          console.log('[Server] Database disconnected.');
          await disconnectRedis();
          console.log('[Server] Redis disconnected.');
          process.exit(0);
        } catch (err) {
          console.error('[Server] Error during shutdown:', err);
          process.exit(1);
        }
      });

      // Force shutdown after 10s
      setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
