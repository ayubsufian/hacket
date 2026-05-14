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
const activeUsersMetrics = require('./middleware/metrics');

// ── Routes ──────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const organizationRoutes = require('./routes/organization.routes');
const bookmarkRoutes = require('./routes/bookmark.routes');
const eventsRoutes = require('./routes/events.routes');
const teamsRoutes = require('./routes/teams.routes');
const submissionsRoutes = require('./routes/submissions.routes');
const judgingRoutes = require('./routes/judging.routes');
const matchingRoutes = require('./routes/matching.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const mentorshipRoutes = require('./routes/mentorship.routes');
const discussionsRoutes = require('./routes/discussions.routes');
const feedbacksRoutes = require('./routes/feedbacks.routes');
const certificatesRoutes = require('./routes/certificates.routes');
const adminRoutes = require('./routes/admin.routes');
const searchRoutes = require('./routes/search.routes');
const staffRoutes = require('./routes/staff.routes');
const storageRoutes = require('./routes/storage.routes');

// ── Initialize Services (registers EventBus listeners) ──────────────────
require('./services/audit/audit.service');
require('./services/notifications/notification.service');

// ── Initialize Workers (UC0026) ─────────────────────────────────────────
const schedulerWorker = require('./workers/scheduler.worker');
schedulerWorker.start();

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
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(activeUsersMetrics);

// ── Logging ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Blob Storage Router ───────────────────────────────────────────────────
// Handled via specific secure routes to avoid public data leaks.

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
app.use(`${API_PREFIX}/profile`, profileRoutes);
app.use(`${API_PREFIX}/organizations`, organizationRoutes);
app.use(`${API_PREFIX}/bookmarks`, bookmarkRoutes);
app.use(`${API_PREFIX}/events`, eventsRoutes);
app.use(`${API_PREFIX}/teams`, teamsRoutes);
app.use(`${API_PREFIX}/submissions`, submissionsRoutes);
app.use(`${API_PREFIX}/judging`, judgingRoutes);
app.use(`${API_PREFIX}/matching`, matchingRoutes);
app.use(`${API_PREFIX}/notifications`, notificationsRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/mentorship`, mentorshipRoutes);
app.use(`${API_PREFIX}/discussions`, discussionsRoutes);
app.use(`${API_PREFIX}/events/:eventId/feedbacks`, feedbacksRoutes);
app.use(`${API_PREFIX}/certificates`, certificatesRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/events/:eventId/staff`, staffRoutes);
app.use(`${API_PREFIX}/storage`, storageRoutes);

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
