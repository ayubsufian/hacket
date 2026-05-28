// =============================================================================
// HackET — Soft JWT Authentication Middleware
// Attempts to extract and verify the Bearer token.
// If valid, attaches decoded user payload to req.user.
// If invalid or missing, simply continues (does not throw 401).
// =============================================================================

const jwt = require('jsonwebtoken');
const { getSession, setSession } = require('../config/redis');
const prisma = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Middleware: Softly verify JWT and attach user to request if possible.
 */
const softAuthenticate = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(); // Proceed without req.user
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return next(); // Proceed without req.user if token invalid/expired
    }

    const session = await getSession(token);
    if (!session) {
      const dbSession = await prisma.session.findFirst({
        where: { userId: decoded.id, token },
      });
      if (!dbSession || new Date(dbSession.expiresAt) <= new Date()) {
        return next();
      }

      if (decoded.role !== 'PARTICIPANT') {
        const inactiveMs = new Date() - new Date(dbSession.lastActiveAt);
        const inactiveMinutes = inactiveMs / 1000 / 60;
        if (inactiveMinutes > 30) {
          return next();
        }
      }
      
      await setSession(token, {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
      });
      
      await prisma.session.update({
        where: { id: dbSession.id },
        data: { lastActiveAt: new Date() },
      });
    } else {
      const eventBus = require('../utils/eventBus');
      eventBus.emit('session:active', { userId: decoded.id, token });
    }

    const liveUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        isActive: true,
        role: true,
        verificationStatus: true,
      },
    });

    if (!liveUser || !liveUser.isActive) {
      return next();
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: liveUser.role,
      verificationStatus: liveUser.verificationStatus,
    };
    req.authToken = token;

    next();
  } catch (err) {
    next(err); // Pass systemic errors to global handler
  }
};

module.exports = softAuthenticate;
