// =============================================================================
// HackET — JWT Authentication Middleware
// Extracts and verifies the Bearer token from the Authorization header.
// Attaches decoded user payload to req.user.
// Also validates session existence in Redis (30-min sliding window).
// =============================================================================

const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const { getSession, setSession } = require('../config/redis');
const prisma = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Middleware: Verify JWT and attach user to request.
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Extract token
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication required. Please log in.', 401));
    }

    // 2. Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Session expired. Please log in again.', 401));
      }
      return next(new AppError('Invalid authentication token.', 401));
    }

    // 3. Check Redis session (30-min sliding window)
    const session = await getSession(decoded.id);
    if (!session) {
      // If Redis session missing, also validate DB session to provide authoritative check
      const dbSession = await prisma.session.findFirst({
        where: { userId: decoded.id, token },
      });
      if (!dbSession || new Date(dbSession.expiresAt) <= new Date()) {
        return next(
          new AppError(
            'Session expired. Please log in again.',
            401,
          ),
        );
      }

      // Check inactivity for non-participants (UC0004)
      if (decoded.role !== 'PARTICIPANT') {
        const inactiveMs = new Date() - new Date(dbSession.lastActiveAt);
        const inactiveMinutes = inactiveMs / 1000 / 60;
        
        if (inactiveMinutes > 30) {
          return next(
            new AppError(
              'Session expired due to inactivity. Please log in again.',
              401,
            ),
          );
        }
      }
      // Restore Redis session for sliding window
      await setSession(decoded.id, {
        role: decoded.role,
        email: decoded.email,
      });
      // update lastActiveAt
      await prisma.session.update({
        where: { id: dbSession.id },
        data: { lastActiveAt: new Date() },
      });
    } else {
      // Refresh DB lastActiveAt in background if session exists in Redis
      try {
        const dbSession = await prisma.session.findFirst({
          where: { userId: decoded.id, token },
        });
        if (dbSession) {
          await prisma.session.update({
            where: { id: dbSession.id },
            data: { lastActiveAt: new Date() },
          });
        }
      } catch (err) {
        console.error(
          '[Auth] Failed to update DB session lastActiveAt:',
          err.message,
        );
      }
    }

    // 4. Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authenticate;
