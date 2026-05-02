// =============================================================================
// HackET — Auth Service
// JWT-based authentication with bcrypt hashing and Redis session management.
// =============================================================================

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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
   * @param {string} [data.organizationName]       - Required for ORGANIZER (UC0001)
   * @param {string} [data.representativeName]      - Required for ORGANIZER (UC0001)
   * @param {string} [data.verificationDocUrl]      - Required for ORGANIZER (UC0001)
   * @returns {{ user, token }}
   */
  async register(
    {
      email, password, role = 'PARTICIPANT', firstName, lastName,
      organizationName, representativeName, verificationDocUrl,
    },
    meta = {},
  ) {
    // Check if user already exists (AF1: Email Already Registered)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(
        'This email is already registered. Please log in or use another email.',
        409,
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Determine verification status: Organizers start as PENDING until admin review
    const isOrganizer = role === 'ORGANIZER';
    const verificationStatus = isOrganizer ? 'PENDING' : 'UNVERIFIED';

    // Create user + profile (+ organization for organizers) in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // 1. Create user with profile
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
          verificationStatus,
          profile: {
            create: {
              firstName,
              lastName,
              representativeName: representativeName || null,
            },
          },
        },
        include: {
          profile: {
            select: {
              firstName: true,
              lastName: true,
              preferredLocale: true,
              representativeName: true,
            },
          },
        },
      });

      // 2. For organizers: create organization with verification doc
      if (isOrganizer && organizationName) {
        const slug = organizationName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          + '-' + newUser.id.slice(0, 8);

        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug,
            verificationDocUrl: verificationDocUrl || null,
            contactEmail: email,
          },
        });

        // Link the user as the organization admin
        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: newUser.id,
            role: 'ADMIN',
          },
        });
      }

      return newUser;
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
      details: { email, role, verificationStatus },
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

    // AF2: Account Not Found
    if (!user) {
      throw new AppError(
        'Account not found. Please create an account.',
        404,
      );
    }

    if (!user.isActive) {
      throw new AppError(
        'This account has been suspended. Please contact support.',
        403,
      );
    }

    // AF1: Incorrect Credentials
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError('Incorrect credentials. Please try again.', 401);
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

  // ─── Forgot / Reset Password (UC0002 AF3) ────────────────────────────

  /**
   * Request a password reset.
   * Generates a secure token, stores it in the DB, and returns it.
   * In production, this token would be emailed to the user.
   * @param {string} email
   * @returns {{ message: string, resetToken?: string }}
   */
  async forgotPassword(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(
        'Account not found. Please create an account.',
        404,
      );
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // Store hashed token with 1-hour expiry
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Audit log
    eventBus.emit('audit:log', {
      actorId: user.id,
      action: 'UPDATE',
      entity: 'user',
      entityId: user.id,
      details: { action: 'password_reset_requested' },
    });

    // In production, send email with reset link containing rawToken.
    // For development, return the token in the response.
    const result = {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };

    if (process.env.NODE_ENV !== 'production') {
      result.resetToken = rawToken;
      result.note =
        'This token is only returned in development mode. In production it would be emailed.';
    }

    return result;
  }

  /**
   * Reset the password using a valid reset token.
   * @param {string} token  - The raw (unhashed) token from the reset link
   * @param {string} newPassword
   * @returns {{ message: string }}
   */
  async resetPassword(token, newPassword) {
    // Hash the incoming token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!resetRecord) {
      throw new AppError(
        'Invalid or expired reset token. Please request a new one.',
        400,
      );
    }

    if (new Date(resetRecord.expiresAt) <= new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetRecord.id },
      });
      throw new AppError(
        'Reset token has expired. Please request a new one.',
        400,
      );
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await prisma.$transaction(async (tx) => {
      // Update password
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      });

      // Delete the used reset token
      await tx.passwordResetToken.delete({
        where: { id: resetRecord.id },
      });

      // Invalidate all existing sessions for security
      await tx.session.deleteMany({
        where: { userId: resetRecord.userId },
      });
    });

    // Destroy Redis session
    await destroySession(resetRecord.userId);

    // Audit log
    eventBus.emit('audit:log', {
      actorId: resetRecord.userId,
      action: 'UPDATE',
      entity: 'user',
      entityId: resetRecord.userId,
      details: { action: 'password_reset_completed' },
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
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
