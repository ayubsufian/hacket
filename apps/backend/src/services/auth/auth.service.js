// =============================================================================
// HackET — Auth Service
// JWT-based authentication with bcrypt hashing and Redis session management.
// =============================================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');
const { setSession, destroySession } = require('../../config/redis');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_SALT_ROUNDS = 12;

class AuthService {
  /**
   * Register a new user.
   * @param {object} data
   * @param {string} data.email
   * @param {string} data.password
   * @param {string} [data.role='PARTICIPANT']
   * @param {string} data.firstName
   * @param {string} data.lastName
   * @returns {{ user, token }}
   */
  async register(
    { email, password, role = 'PARTICIPANT', firstName, lastName },
    meta = {},
  ) {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create user + profile in a transaction
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        profile: {
          create: {
            firstName,
            lastName,
          },
        },
      },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            preferredLocale: true,
          },
        },
      },
    });

    // Generate JWT
    const token = this._generateToken(user);

    // Create Redis session
    await setSession(user.id, { role: user.role, email: user.email });

    // Create DB session record
    const decoded = jwt.decode(token);
    const expiresAt =
      decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date();
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        userAgent: meta.userAgent || null,
        ipAddress: meta.ip || null,
        lastActiveAt: new Date(),
        expiresAt,
      },
    });

    // Audit log
    eventBus.emit('audit:log', {
      actorId: user.id,
      action: 'CREATE',
      entity: 'user',
      entityId: user.id,
      details: { email, role },
    });

    return {
      user: this._sanitizeUser(user),
      token,
    };
  }

  /**
   * Login with email and password.
   * @param {object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @returns {{ user, token, dashboardRedirect }}
   */
  async login({ email, password }, meta = {}) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: {
          select: { firstName: true, lastName: true, preferredLocale: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password.', 401);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    // Generate JWT
    const token = this._generateToken(user);

    // Create Redis session
    await setSession(user.id, { role: user.role, email: user.email });

    // Create DB session record (if metadata passed in arguments)
    try {
      const decoded = jwt.decode(token);
      const expiresAt =
        decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date();
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          userAgent: meta.userAgent || null,
          ipAddress: meta.ip || null,
          lastActiveAt: new Date(),
          expiresAt,
        },
      });
    } catch (err) {
      // Non-fatal: ensure login proceeds even if DB session creation fails
      console.error('[Auth] Failed to create DB session:', err.message);
    }

    // Audit log
    eventBus.emit('audit:log', {
      actorId: user.id,
      action: 'LOGIN',
      entity: 'user',
      entityId: user.id,
    });

    return {
      user: this._sanitizeUser(user),
      token,
      dashboardRedirect: this._getDashboardPath(user.role),
    };
  }

  /**
   * Logout: destroy Redis session.
   * @param {string} userId
   */
  async logout(userId, token) {
    // Remove Redis session
    await destroySession(userId);

    // Remove DB session(s)
    try {
      if (token) {
        await prisma.session.deleteMany({ where: { userId, token } });
      } else {
        await prisma.session.deleteMany({ where: { userId } });
      }
    } catch (err) {
      console.error('[Auth] Failed to delete DB session:', err.message);
    }

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'LOGOUT',
      entity: 'user',
      entityId: userId,
    });
  }

  /**
   * Get current user profile.
   * @param {string} userId
   * @returns {object}
   */
  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return this._sanitizeUser(user);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  _generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );
  }

  _sanitizeUser(user) {
    const { password, ...safe } = user;
    return safe;
  }

  _getDashboardPath(role) {
    const dashboards = {
      ADMIN: '/admin/dashboard',
      ORGANIZER: '/organizer/dashboard',
      JUDGE: '/judge/dashboard',
      MENTOR: '/mentor/dashboard',
      PARTICIPANT: '/participant/dashboard',
    };
    return dashboards[role] || '/dashboard';
  }
}

module.exports = new AuthService();
