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

const PROFILE_COMPLETION_ALLOWED_ROUTES = [
  { method: 'GET', path: /^\/api\/v1\/auth\/me(?:\?|$)/ },
  { method: 'POST', path: /^\/api\/v1\/auth\/logout(?:\?|$)/ },
  { method: 'POST', path: /^\/api\/v1\/auth\/extend-session(?:\?|$)/ },
  { method: 'GET', path: /^\/api\/v1\/profile\/me(?:\?|$)/ },
  { method: 'PATCH', path: /^\/api\/v1\/profile\/me(?:\?|$)/ },
];

function isProfileCompletionAllowedRoute(req) {
  return PROFILE_COMPLETION_ALLOWED_ROUTES.some((route) => (
    route.method === req.method && route.path.test(req.originalUrl)
  ));
}

function isIncompleteProfile(profile) {
  const firstName = profile?.firstName?.trim();
  const lastName = profile?.lastName?.trim();

  return !firstName
    || !lastName
    || firstName === 'New'
    || lastName === 'User';
}

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
    const session = await getSession(token);
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
      await setSession(token, {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
      });
      // update lastActiveAt
      await prisma.session.update({
        where: { id: dbSession.id },
        data: { lastActiveAt: new Date() },
      });
    } else {
      // Cache HIT: getSession() already extended the Redis TTL.
      // 2026 Standard: Never block the main thread with a DB write on every request.
      // Fire-and-forget event to update the DB lastActiveAt (throttled internally by listeners if needed).
      const eventBus = require('../utils/eventBus');
      eventBus.emit('session:active', { userId: decoded.id, token });
    }

    // 4. Verify user is not suspended (2026 Security: Defense-in-depth)
    // On Redis cache miss path, we already hit the DB. On cache hit, we do a
    // lightweight check periodically. For maximum security, always verify.
    const liveUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        isActive: true,
        role: true,
        verificationStatus: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!liveUser) {
      return next(new AppError('User account no longer exists.', 401));
    }

    if (!liveUser.isActive) {
      // Immediately destroy the session
      const { destroySession: destroy } = require('../config/redis');
      await destroy(token);
      return next(
        new AppError('This account has been suspended. Please contact support.', 403)
      );
    }

    // 5. Attach user info to request (use live role from DB, not stale JWT)
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: liveUser.role,
      verificationStatus: liveUser.verificationStatus,
      isProfileIncomplete: isIncompleteProfile(liveUser.profile),
    };
    req.authToken = token;

    if (
      req.user.isProfileIncomplete
      && req.user.role !== 'ADMIN'
      && !isProfileCompletionAllowedRoute(req)
    ) {
      const missingFields = [
        liveUser.profile?.firstName?.trim() && liveUser.profile.firstName !== 'New' ? null : 'firstName',
        liveUser.profile?.lastName?.trim() && liveUser.profile.lastName !== 'User' ? null : 'lastName',
      ].filter(Boolean);

      return next(
        Object.assign(
          new AppError('Please complete your first and last name before accessing the platform.', 403),
          {
            code: 'PROFILE_NAME_REQUIRED',
            data: {
              code: 'PROFILE_NAME_REQUIRED',
              requiredFields: missingFields,
              profileCompletionUrl: '/profile/me',
            },
          },
        ),
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authenticate;
