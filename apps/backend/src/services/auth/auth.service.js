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
   * @param {string} [data.representativeName]
   * @returns {{ user, token }}
   */
  async register(
    {
      email, password, role = 'PARTICIPANT', firstName, lastName,
      organizationName, representativeName,
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

    // Email/password registrations must prove email ownership before any role-specific review.
    const isOrganizer = role === 'ORGANIZER';
    const verificationStatus = 'UNVERIFIED';

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
              representativeName: representativeName || `${firstName} ${lastName}`.trim(),
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
            verificationDocUrl: null,
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
    await setSession(token, { role: user.role, email: user.email, id: user.id });

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

    // Generate a secure email verification token
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto
      .createHash('sha256')
      .update(rawVerificationToken)
      .digest('hex');

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: hashedVerificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const result = {
      user: this._sanitizeUser(user),
      token,
      message: 'Registration successful. Please verify your email.',
    };

    if (process.env.NODE_ENV !== 'production') {
      result.verificationToken = rawVerificationToken;
      result.note = 'This verification token is only returned in development mode. In production it would be emailed.';
    }

    // Emit event to background email worker
    eventBus.emit('email:verification_requested', {
      email: user.email,
      token: rawVerificationToken,
      firstName: user.profile?.firstName,
      role: user.role,
    });

    return result;
  }

  /**
   * Verify a user's email using a valid verification token.
   * @param {string} token - The raw (unhashed) verification token
   * @returns {{ message: string }}
   */
  async verifyEmail(token) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const verificationRecord = await prisma.emailVerificationToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!verificationRecord) {
      throw new AppError(
        'Invalid or expired verification token. Please request a new one.',
        400,
      );
    }

    if (new Date(verificationRecord.expiresAt) <= new Date()) {
      await prisma.emailVerificationToken.delete({
        where: { id: verificationRecord.id },
      });
      throw new AppError(
        'Verification token has expired. Please request a new one.',
        400,
      );
    }

    const newStatus = verificationRecord.user.verificationStatus === 'UNVERIFIED'
      ? (verificationRecord.user.role === 'ORGANIZER' ? 'PENDING' : 'VERIFIED')
      : verificationRecord.user.verificationStatus;

    await prisma.$transaction(async (tx) => {
      // Update user status
      if (newStatus !== verificationRecord.user.verificationStatus) {
        await tx.user.update({
          where: { id: verificationRecord.userId },
          data: { verificationStatus: newStatus },
        });
      }

      // Delete the used token
      await tx.emailVerificationToken.delete({
        where: { id: verificationRecord.id },
      });
    });

    eventBus.emit('audit:log', {
      actorId: verificationRecord.userId,
      action: 'UPDATE',
      entity: 'user',
      entityId: verificationRecord.userId,
      details: { action: 'email_verified', previousStatus: verificationRecord.user.verificationStatus, newStatus },
    });

    return {
      message: verificationRecord.user.role === 'ORGANIZER'
        ? 'Email successfully verified. Your organizer account is pending verification document submission.'
        : 'Email successfully verified. Thank you!',
      status: newStatus,
    };
  }

  /**
   * Resend the verification email for an unverified account.
   * @param {string} email
   * @returns {{ message: string, verificationToken?: string, note?: string }}
   */
  async resendVerificationEmail(email) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: {
          select: {
            firstName: true,
          },
        },
      },
    });

    if (!user) {
      // Return a generic success message to prevent email enumeration attacks
      return { message: 'If your account exists and is unverified, a new verification link has been sent.' };
    }

    if (user.verificationStatus === 'VERIFIED') {
      return {
        message: 'This account is already verified. Please log in.',
        status: 'ALREADY_VERIFIED',
      };
    }

    // Delete any existing tokens for this user
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate a secure email verification token
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto
      .createHash('sha256')
      .update(rawVerificationToken)
      .digest('hex');

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: hashedVerificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const result = {
      message: 'If your account exists and is unverified, a new verification link has been sent.',
    };

    if (process.env.NODE_ENV !== 'production') {
      result.verificationToken = rawVerificationToken;
      result.note = 'This verification token is only returned in development mode. In production it would be emailed.';
    }

    // Emit event to background email worker
    eventBus.emit('email:verification_requested', {
      email: user.email,
      token: rawVerificationToken,
      firstName: user.profile?.firstName,
      role: user.role,
    });

    return result;
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

    // To prevent timing attacks, we always execute a bcrypt operation even if the user doesn't exist
    let isValid = false;
    if (user?.password) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      // Dummy hash to consume equal CPU time
      await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    }

    // AF2 & AF1: Generic error to prevent User Enumeration
    if (!user || !isValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (!user.isActive) {
      throw new AppError(
        'This account has been suspended. Please contact support.',
        403,
      );
    }

    if (user.verificationStatus === 'UNVERIFIED') {
      throw new AppError(
        'Please verify your email address before logging in.',
        403,
      );
    }

    if (user.verificationStatus === 'REJECTED') {
      throw new AppError(
        'Your Organizer account registration has been rejected. Please contact support for more details.',
        403,
      );
    }

    // Generate JWT
    const token = this._generateToken(user);

    // Create Redis session
    await setSession(token, { role: user.role, email: user.email, id: user.id });

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
  async logout(userId, token = null) {
    if (token) {
      await destroySession(token);
      await prisma.session.deleteMany({ where: { userId, token } });
    } else {
      const activeSessions = await prisma.session.findMany({
        where: { userId },
        select: { token: true },
      });

      for (const session of activeSessions) {
        try {
          await destroySession(session.token);
        } catch (err) {
          throw new AppError(
            'Logout could not be completed. Please try again.',
            503,
          );
        }
      }

      await prisma.session.deleteMany({ where: { userId } });
    }

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'LOGOUT',
      entity: 'user',
      entityId: userId,
    });
  }

  // ─── Fetch Current User Profile ────────────────────────────────────────

  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        staffAssignments: {
          include: {
            hackathon: {
              select: { id: true, title: true, status: true }
            }
          }
        },
        mentorAssignments: {
          include: {
            team: {
              select: { id: true, name: true, hackathonId: true }
            }
          }
        }
      }
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return this._sanitizeUser(user);
  }

  // ─── OAuth 2.0 Integrations (2026 Standards) ─────────────────────────

  /**
   * Handle Google OAuth 2.0 Login / Registration
   * Exchanges the auth code for tokens, fetches user info, and creates/logs in the user.
   */
  async googleOAuthLogin({ code, redirectUri, codeVerifier }, meta = {}) {
    const googleUser = await this._exchangeGoogleAuthorizationCode({
      code,
      redirectUri,
      codeVerifier,
    });

    return this._completeGoogleOAuthLogin(googleUser, meta);
  }

  async googleOrganizerOAuthRegister(
    {
      code,
      redirectUri,
      codeVerifier,
      organizationName,
      representativeName,
    },
    meta = {},
  ) {
    const googleUser = await this._exchangeGoogleAuthorizationCode({
      code,
      redirectUri,
      codeVerifier,
    });

    return this._completeGoogleOrganizerOAuthRegistration(
      googleUser,
      {
        organizationName,
        representativeName,
      },
      meta,
    );
  }

  async _exchangeGoogleAuthorizationCode({ code, redirectUri, codeVerifier }) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new AppError('Google OAuth is not configured.', 503);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const configuredRedirectUri =
      process.env.GOOGLE_REDIRECT_URI || `${frontendUrl}/oauth/google/callback`;
    const oauthRedirectUri = redirectUri || configuredRedirectUri;

    if (oauthRedirectUri !== configuredRedirectUri) {
      throw new AppError('Invalid Google OAuth redirect URI.', 400);
    }

    if (process.env.NODE_ENV === 'production' && !codeVerifier) {
      throw new AppError('PKCE code verifier is required for Google OAuth.', 400);
    }

    const tokenRequestBody = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: oauthRedirectUri,
      grant_type: 'authorization_code',
    };

    if (codeVerifier) {
      tokenRequestBody.code_verifier = codeVerifier;
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenRequestBody).toString(),
    });

    if (!tokenResponse.ok) {
      throw new AppError('Failed to authenticate with Google.', 401);
    }

    const { access_token } = await tokenResponse.json();

    if (!access_token) {
      throw new AppError('Google did not return an access token.', 401);
    }

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileResponse.ok) {
      throw new AppError('Failed to fetch Google profile.', 401);
    }

    const googleUser = await profileResponse.json();

    if (!googleUser.email || !googleUser.id) {
      throw new AppError('Google did not return the required account profile.', 401);
    }

    if (!googleUser.verified_email) {
      throw new AppError('A verified Google email is required to log in.', 400);
    }

    return googleUser;
  }

  async _completeGoogleOAuthLogin(googleUser, meta = {}) {
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
      include: { profile: true },
    });

    if (user) {
      if (!user.isActive) {
        throw new AppError('This account has been suspended. Please contact support.', 403);
      }

      if (user.authProvider === 'GOOGLE' && user.providerId && user.providerId !== googleUser.id) {
        throw new AppError('This email is linked to a different Google account.', 409);
      }
      
      const shouldLinkGoogle = user.authProvider !== 'GOOGLE' || user.providerId !== googleUser.id;
      const shouldVerifyEmail = user.verificationStatus === 'UNVERIFIED' && googleUser.verified_email;

      if (shouldLinkGoogle || shouldVerifyEmail) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            authProvider: 'GOOGLE',
            providerId: googleUser.id,
            ...(shouldVerifyEmail && { verificationStatus: 'VERIFIED' }),
          },
          include: { profile: true },
        });
      }
    } else {
      // Create new user instantly (Verified by default since Google verified the email)
      const { firstName, lastName, isProfileIncomplete } = this._derivePersonName({
        givenName: googleUser.given_name,
        familyName: googleUser.family_name,
        fullName: googleUser.name,
      });

      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          authProvider: 'GOOGLE',
          providerId: googleUser.id,
          verificationStatus: googleUser.verified_email ? 'VERIFIED' : 'UNVERIFIED',
          profile: {
            create: {
              firstName,
              lastName,
              avatarUrl: googleUser.picture || null,
            },
          },
        },
        include: { profile: true },
      });

      eventBus.emit('audit:log', {
        actorId: user.id,
        action: 'CREATE',
        entity: 'user',
        entityId: user.id,
        details: { action: 'google_oauth_signup', isProfileIncomplete },
      });
    }

    // 4. Generate JWT & Redis Session
    const token = this._generateToken(user);
    await setSession(token, { role: user.role, email: user.email, id: user.id });

    try {
      const decoded = jwt.decode(token);
      const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date();
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
      console.error('[OAuth] Failed to create DB session:', err.message);
    }

    // 2026 Standard: Flag incomplete profiles so the frontend can redirect to profile completion
    const isProfileIncomplete = !user.profile?.firstName || user.profile?.firstName === 'New' 
      || !user.profile?.lastName || user.profile?.lastName === 'User';

    return {
      user: this._sanitizeUser(user),
      token,
      dashboardRedirect: this._getDashboardPath(user.role),
      isProfileIncomplete,
    };
  }

  async _completeGoogleOrganizerOAuthRegistration(googleUser, organizerData, meta = {}) {
    const { organizationName } = organizerData;
    const { firstName, lastName, isProfileIncomplete } = this._derivePersonName({
      givenName: googleUser.given_name,
      familyName: googleUser.family_name,
      fullName: googleUser.name,
    });
    const representativeName = organizerData.representativeName
      || googleUser.name
      || `${firstName} ${lastName}`.trim()
      || null;

    if (!organizationName) {
      throw new AppError('Organization name is required for Organizer accounts.', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: googleUser.email },
      include: {
        profile: true,
        organizationMemberships: {
          include: { organization: true },
        },
      },
    });

    if (existingUser && !existingUser.isActive) {
      throw new AppError('This account has been suspended. Please contact support.', 403);
    }

    if (
      existingUser?.authProvider === 'GOOGLE'
      && existingUser.providerId
      && existingUser.providerId !== googleUser.id
    ) {
      throw new AppError('This email is linked to a different Google account.', 409);
    }

    if (existingUser && !['PARTICIPANT', 'ORGANIZER'].includes(existingUser.role)) {
      throw new AppError('This account cannot be registered as an organizer.', 400);
    }

    let organization = existingUser?.organizationMemberships?.[0]?.organization || null;
    let user;
    let createdOrganizerApplication = false;

    if (existingUser?.role === 'ORGANIZER') {
      const result = await prisma.$transaction(async (tx) => {
        const organizer = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            authProvider: 'GOOGLE',
            providerId: googleUser.id,
          },
          include: { profile: true },
        });

        if (organization) {
          return { organizer, org: organization, createdOrganization: false };
        }

        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug: this._buildOrganizationSlug(organizationName, organizer.id),
            verificationDocUrl: null,
            contactEmail: googleUser.email,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: organizer.id,
            role: 'ADMIN',
          },
        });

        return { organizer, org, createdOrganization: true };
      });

      user = result.organizer;
      organization = result.org;
      createdOrganizerApplication = result.createdOrganization;

      if (result.createdOrganization) {
        eventBus.emit('audit:log', {
          actorId: user.id,
          action: 'UPDATE',
          entity: 'user',
          entityId: user.id,
          details: {
            action: 'google_oauth_organizer_organization_added',
            organizationId: organization.id,
            organizationName,
          },
        });
      }
    } else {
      const result = await prisma.$transaction(async (tx) => {
        const organizer = existingUser
          ? await tx.user.update({
              where: { id: existingUser.id },
              data: {
                role: 'ORGANIZER',
                verificationStatus: 'PENDING',
                authProvider: 'GOOGLE',
                providerId: googleUser.id,
                profile: {
                  upsert: {
                    create: {
                      firstName,
                      lastName,
                      representativeName,
                      avatarUrl: googleUser.picture || null,
                    },
                    update: {
                      representativeName,
                      ...(!existingUser.profile?.avatarUrl && googleUser.picture
                        ? { avatarUrl: googleUser.picture }
                        : {}),
                    },
                  },
                },
              },
              include: { profile: true },
            })
          : await tx.user.create({
              data: {
                email: googleUser.email,
                role: 'ORGANIZER',
                verificationStatus: 'PENDING',
                authProvider: 'GOOGLE',
                providerId: googleUser.id,
                profile: {
                  create: {
                    firstName,
                    lastName,
                    representativeName,
                    avatarUrl: googleUser.picture || null,
                  },
                },
              },
              include: { profile: true },
            });

        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug: this._buildOrganizationSlug(organizationName, organizer.id),
            verificationDocUrl: null,
            contactEmail: googleUser.email,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: organizer.id,
            role: 'ADMIN',
          },
        });

        return { organizer, org };
      });

      user = result.organizer;
      organization = result.org;
      createdOrganizerApplication = true;

      eventBus.emit('audit:log', {
        actorId: user.id,
        action: existingUser ? 'ROLE_UPGRADE_REQUESTED' : 'CREATE',
        entity: 'user',
        entityId: user.id,
        details: {
          action: existingUser ? 'google_oauth_organizer_upgrade' : 'google_oauth_organizer_signup',
          organizationId: organization.id,
          organizationName,
          verificationStatus: 'PENDING',
        },
      });
    }

    const token = this._generateToken(user);
    await setSession(token, { role: user.role, email: user.email, id: user.id });

    try {
      const decoded = jwt.decode(token);
      const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date();
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
      console.error('[OAuth] Failed to create DB session:', err.message);
    }

    return {
      user: this._sanitizeUser(user),
      token,
      organization,
      dashboardRedirect: this._getDashboardPath(user.role),
      isProfileIncomplete,
      statusCode: createdOrganizerApplication ? 201 : 200,
      message: user.verificationStatus === 'VERIFIED'
        ? 'Google OAuth organizer login successful.'
        : 'Organizer registration submitted. Your organization is pending admin review.',
    };
  }

  /**
   * Handle GitHub OAuth 2.0 Login / Registration
   * Exchanges the auth code for tokens, fetches user info and primary email.
   */
  async githubOAuthLogin(code, meta = {}) {
    const githubUser = await this._exchangeGitHubAuthorizationCode(code);
    return this._completeGitHubOAuthLogin(githubUser, meta);
  }

  async githubOrganizerOAuthRegister({ code, organizationName, representativeName }, meta = {}) {
    const githubUser = await this._exchangeGitHubAuthorizationCode(code);
    return this._completeGitHubOrganizerOAuthRegistration(
      githubUser,
      {
        organizationName,
        representativeName,
      },
      meta,
    );
  }

  async _exchangeGitHubAuthorizationCode(code) {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      throw new AppError('GitHub OAuth is not configured.', 503);
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new AppError('Failed to authenticate with GitHub.', 401);
    }

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new AppError(tokenData.error_description || 'GitHub OAuth failed.', 401);
    }

    const { access_token } = tokenData;

    if (!access_token) {
      throw new AppError('GitHub did not return an access token.', 401);
    }

    const profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!profileResponse.ok) {
      throw new AppError('Failed to fetch GitHub profile.', 401);
    }

    const githubUser = await profileResponse.json();

    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!emailsResponse.ok) {
      throw new AppError('Failed to fetch GitHub emails.', 401);
    }

    const emails = await emailsResponse.json();
    // Get the primary, verified email
    const primaryEmailObj = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified);
    
    if (!primaryEmailObj) {
      throw new AppError('A verified GitHub email is required to log in.', 400);
    }

    const email = primaryEmailObj.email;

    return {
      id: String(githubUser.id),
      email,
      name: githubUser.name || '',
      login: githubUser.login || '',
      avatarUrl: githubUser.avatar_url || null,
      htmlUrl: githubUser.html_url || null,
      bio: githubUser.bio || null,
    };
  }

  async _completeGitHubOAuthLogin(githubUser, meta = {}) {
    let user = await prisma.user.findUnique({
      where: { email: githubUser.email },
      include: { profile: true },
    });

    if (user) {
      if (!user.isActive) {
        throw new AppError('This account has been suspended. Please contact support.', 403);
      }

      if (user.authProvider === 'GITHUB' && user.providerId && user.providerId !== githubUser.id) {
        throw new AppError('This email is linked to a different GitHub account.', 409);
      }
      
      const shouldLinkGitHub = user.authProvider !== 'GITHUB' || user.providerId !== githubUser.id;
      const shouldVerifyEmail = user.verificationStatus === 'UNVERIFIED';

      if (shouldLinkGitHub || shouldVerifyEmail) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            authProvider: 'GITHUB',
            providerId: githubUser.id,
            ...(shouldVerifyEmail && { verificationStatus: 'VERIFIED' }),
          },
          include: { profile: true },
        });
      }
    } else {
      const { firstName, lastName, isProfileIncomplete } = this._derivePersonName({
        fullName: githubUser.name,
        fallbackName: githubUser.login,
      });

      user = await prisma.user.create({
        data: {
          email: githubUser.email,
          authProvider: 'GITHUB',
          providerId: githubUser.id,
          verificationStatus: 'VERIFIED',
          profile: {
            create: {
              firstName,
              lastName,
              githubUrl: githubUser.htmlUrl,
              avatarUrl: githubUser.avatarUrl,
              bio: githubUser.bio || null,
            },
          },
        },
        include: { profile: true },
      });

      eventBus.emit('audit:log', {
        actorId: user.id,
        action: 'CREATE',
        entity: 'user',
        entityId: user.id,
        details: { action: 'github_oauth_signup', isProfileIncomplete },
      });
    }

    // 5. Generate JWT & Redis Session
    const token = this._generateToken(user);
    await setSession(token, { role: user.role, email: user.email, id: user.id });

    try {
      const decoded = jwt.decode(token);
      const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date();
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
      console.error('[OAuth] Failed to create DB session:', err.message);
    }

    // 2026 Standard: Flag incomplete profiles so the frontend can redirect to profile completion
    const isProfileIncomplete = !user.profile?.firstName || user.profile?.firstName === 'New' 
      || !user.profile?.lastName || user.profile?.lastName === 'User';

    return {
      user: this._sanitizeUser(user),
      token,
      dashboardRedirect: this._getDashboardPath(user.role),
      isProfileIncomplete,
    };
  }

  async _completeGitHubOrganizerOAuthRegistration(githubUser, organizerData, meta = {}) {
    const { organizationName } = organizerData;
    const { firstName, lastName, isProfileIncomplete } = this._derivePersonName({
      fullName: githubUser.name,
      fallbackName: githubUser.login,
    });
    const representativeName = organizerData.representativeName
      || githubUser.name
      || `${firstName} ${lastName}`.trim()
      || null;

    if (!organizationName) {
      throw new AppError('Organization name is required for Organizer accounts.', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: githubUser.email },
      include: {
        profile: true,
        organizationMemberships: {
          include: { organization: true },
        },
      },
    });

    if (existingUser && !existingUser.isActive) {
      throw new AppError('This account has been suspended. Please contact support.', 403);
    }

    if (
      existingUser?.authProvider === 'GITHUB'
      && existingUser.providerId
      && existingUser.providerId !== githubUser.id
    ) {
      throw new AppError('This email is linked to a different GitHub account.', 409);
    }

    if (existingUser && !['PARTICIPANT', 'ORGANIZER'].includes(existingUser.role)) {
      throw new AppError('This account cannot be registered as an organizer.', 400);
    }

    let organization = existingUser?.organizationMemberships?.[0]?.organization || null;
    let user;
    let createdOrganizerApplication = false;

    if (existingUser?.role === 'ORGANIZER') {
      const result = await prisma.$transaction(async (tx) => {
        const organizer = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            authProvider: 'GITHUB',
            providerId: githubUser.id,
          },
          include: { profile: true },
        });

        if (organization) {
          return { organizer, org: organization, createdOrganization: false };
        }

        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug: this._buildOrganizationSlug(organizationName, organizer.id),
            verificationDocUrl: null,
            contactEmail: githubUser.email,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: organizer.id,
            role: 'ADMIN',
          },
        });

        return { organizer, org, createdOrganization: true };
      });

      user = result.organizer;
      organization = result.org;
      createdOrganizerApplication = result.createdOrganization;

      if (result.createdOrganization) {
        eventBus.emit('audit:log', {
          actorId: user.id,
          action: 'UPDATE',
          entity: 'user',
          entityId: user.id,
          details: {
            action: 'github_oauth_organizer_organization_added',
            organizationId: organization.id,
            organizationName,
          },
        });
      }
    } else {
      const result = await prisma.$transaction(async (tx) => {
        const organizer = existingUser
          ? await tx.user.update({
              where: { id: existingUser.id },
              data: {
                role: 'ORGANIZER',
                verificationStatus: 'PENDING',
                authProvider: 'GITHUB',
                providerId: githubUser.id,
                profile: {
                  upsert: {
                    create: {
                      firstName,
                      lastName,
                      representativeName,
                      githubUrl: githubUser.htmlUrl,
                      avatarUrl: githubUser.avatarUrl,
                      bio: githubUser.bio || null,
                    },
                    update: {
                      representativeName,
                      ...(!existingUser.profile?.githubUrl && githubUser.htmlUrl
                        ? { githubUrl: githubUser.htmlUrl }
                        : {}),
                      ...(!existingUser.profile?.avatarUrl && githubUser.avatarUrl
                        ? { avatarUrl: githubUser.avatarUrl }
                        : {}),
                      ...(!existingUser.profile?.bio && githubUser.bio
                        ? { bio: githubUser.bio }
                        : {}),
                    },
                  },
                },
              },
              include: { profile: true },
            })
          : await tx.user.create({
              data: {
                email: githubUser.email,
                role: 'ORGANIZER',
                verificationStatus: 'PENDING',
                authProvider: 'GITHUB',
                providerId: githubUser.id,
                profile: {
                  create: {
                    firstName,
                    lastName,
                    representativeName,
                    githubUrl: githubUser.htmlUrl,
                    avatarUrl: githubUser.avatarUrl,
                    bio: githubUser.bio || null,
                  },
                },
              },
              include: { profile: true },
            });

        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug: this._buildOrganizationSlug(organizationName, organizer.id),
            verificationDocUrl: null,
            contactEmail: githubUser.email,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: organizer.id,
            role: 'ADMIN',
          },
        });

        return { organizer, org };
      });

      user = result.organizer;
      organization = result.org;
      createdOrganizerApplication = true;

      eventBus.emit('audit:log', {
        actorId: user.id,
        action: existingUser ? 'ROLE_UPGRADE_REQUESTED' : 'CREATE',
        entity: 'user',
        entityId: user.id,
        details: {
          action: existingUser ? 'github_oauth_organizer_upgrade' : 'github_oauth_organizer_signup',
          organizationId: organization.id,
          organizationName,
          verificationStatus: 'PENDING',
        },
      });
    }

    const token = this._generateToken(user);
    await setSession(token, { role: user.role, email: user.email, id: user.id });

    try {
      const decoded = jwt.decode(token);
      const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date();
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
      console.error('[OAuth] Failed to create DB session:', err.message);
    }

    return {
      user: this._sanitizeUser(user),
      token,
      organization,
      dashboardRedirect: this._getDashboardPath(user.role),
      isProfileIncomplete,
      statusCode: createdOrganizerApplication ? 201 : 200,
      message: user.verificationStatus === 'VERIFIED'
        ? 'GitHub OAuth organizer login successful.'
        : 'Organizer registration submitted. Your organization is pending admin review.',
    };
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

    // Emit event to background email worker
    eventBus.emit('email:password_reset_requested', {
      email: user.email,
      token: rawToken,
      firstName: user.profile?.firstName,
    });

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

      // Invalidate all existing sessions in Redis and DB for security
      const sessions = await tx.session.findMany({ where: { userId: resetRecord.userId } });
      for (const s of sessions) {
        await destroySession(s.token);
      }
      
      await tx.session.deleteMany({
        where: { userId: resetRecord.userId },
      });
    });

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

  /**
   * AF1: Organizer submits documents for administrative approval.
   */
  async submitVerification(userId, verificationDocUrl) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationMemberships: {
          include: { organization: true },
        },
      },
    });
    
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    if (user.role !== 'ORGANIZER') {
      throw new AppError('Only organizers need to submit verification documents.', 400);
    }

    if (user.verificationStatus === 'VERIFIED') {
      throw new AppError('Your account is already verified.', 400);
    }

    if (user.verificationStatus === 'REJECTED') {
      throw new AppError('Your organizer verification was rejected. Please contact support before resubmitting.', 403);
    }

    const membership = user.organizationMemberships?.[0];
    if (!membership?.organization) {
      throw new AppError('Organizer organization record not found. Please contact support.', 409);
    }

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: membership.organizationId },
        data: { verificationDocUrl },
      });

      await tx.user.update({
        where: { id: userId },
        data: { verificationStatus: 'UNDER_REVIEW' },
      });
    });

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'SUBMIT_VERIFICATION',
      entity: 'user',
      entityId: userId,
      details: {
        organizationId: membership.organizationId,
        verificationDocUrl,
        previousStatus: user.verificationStatus,
        newStatus: 'UNDER_REVIEW',
      },
    });

    return {
      message: 'Verification document submitted successfully. An administrator will review it shortly.',
      status: 'UNDER_REVIEW',
    };
  }

  // ─── Role Upgrade: Participant → Organizer ──────────────────────────────

  /**
   * Allow an existing PARTICIPANT to request an upgrade to ORGANIZER.
   * Requires organizational credentials for admin review.
   * @param {string} userId
   * @param {object} data
   * @param {string} data.organizationName
   * @param {string} [data.representativeName]
   * @returns {{ message: string }}
   */
  async requestOrganizerUpgrade(userId, { organizationName, representativeName }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    if (user.role === 'ORGANIZER') {
      throw new AppError('You are already an Organizer.', 400);
    }

    if (user.role === 'ADMIN') {
      throw new AppError('Admin accounts cannot be downgraded to Organizer.', 400);
    }

    if (!organizationName) {
      throw new AppError('Organization name is required to become an Organizer.', 400);
    }

    // Create the organization and upgrade the user's role in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Upgrade user role to ORGANIZER and set verification to PENDING
      await tx.user.update({
        where: { id: userId },
        data: {
          role: 'ORGANIZER',
          verificationStatus: 'PENDING',
        },
      });

      // 2. Update representative name if provided
      if (representativeName) {
        await tx.userProfile.update({
          where: { userId },
          data: { representativeName },
        });
      }

      // 3. Create the organization
      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + userId.slice(0, 8);

      const org = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          verificationDocUrl: null,
          contactEmail: user.email,
        },
      });

      // 4. Link the user as the organization admin
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: 'ADMIN',
        },
      });
    });

    // Audit log
    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'ROLE_UPGRADE_REQUESTED',
      entity: 'user',
      entityId: userId,
      details: { previousRole: 'PARTICIPANT', newRole: 'ORGANIZER', organizationName },
    });

    return {
      message: 'Your Organizer upgrade request has been submitted. An administrator will review your credentials shortly.',
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  _generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        verificationStatus: user.verificationStatus,
      },
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

  _derivePersonName({ givenName, familyName, fullName, fallbackName } = {}) {
    const cleanGivenName = givenName?.trim() || '';
    const cleanFamilyName = familyName?.trim() || '';
    const cleanFullName = fullName?.trim() || '';
    const cleanFallbackName = fallbackName?.trim() || '';

    if (cleanGivenName && cleanFamilyName) {
      return {
        firstName: cleanGivenName,
        lastName: cleanFamilyName,
        isProfileIncomplete: false,
      };
    }

    const sourceName = cleanFullName || cleanFallbackName;
    const nameParts = sourceName.split(/\s+/).filter(Boolean);
    const firstName = cleanGivenName || nameParts[0] || 'New';
    const lastName = cleanFamilyName || nameParts.slice(1).join(' ') || 'User';
    const hasCompleteFullName = Boolean(cleanFullName && nameParts.length > 1);

    return {
      firstName,
      lastName,
      isProfileIncomplete: !(cleanGivenName && cleanFamilyName) && !hasCompleteFullName,
    };
  }

  _buildOrganizationSlug(organizationName, userId) {
    const baseSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'organization';

    return `${baseSlug}-${userId.slice(0, 8)}`;
  }
}

module.exports = new AuthService();
