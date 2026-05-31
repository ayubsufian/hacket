// =============================================================================
// HackET — Rate Limiting Middleware
// 2026 Standard: Protect against brute-force, credential stuffing, and DoS.
// =============================================================================

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

/**
 * Global API rate limiter.
 * Applies to all /api/v1/* routes.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                  // 200 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many requests. Please try again later.',
  },
});

/**
 * Strict limiter for authentication endpoints.
 * Prevents brute-force login, credential stuffing, and registration spam.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                   // 15 attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

/**
 * Password reset limiter.
 * Prevents abuse of password reset emails.
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 reset requests per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many password reset attempts. Please try again after 1 hour.',
  },
});

/**
 * Team invitation limiter.
 * Limits invite spam per authenticated user when req.user is available,
 * falling back to IP for unauthenticated/edge cases.
 */
const invitationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  message: {
    success: false,
    status: 'fail',
    message: 'Too many team invitations. Please try again after 1 hour.',
  },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.user?.id || ipKeyGenerator(req.ip)}:${req.ip}`,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many admin requests. Please try again later.',
  },
});

const adminMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.user?.id || ipKeyGenerator(req.ip)}:${req.ip}`,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many administrative changes. Please wait before trying again.',
  },
});

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.user?.id || ipKeyGenerator(req.ip)}:${req.ip}`,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many feedback attempts. Please try again later.',
  },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.user?.id || ipKeyGenerator(req.ip)}:${req.ip}`,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many upload requests. Please try again later.',
  },
});

const searchLogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  message: {
    success: false,
    status: 'fail',
    message: 'Too many search requests. Please slow down.',
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  invitationLimiter,
  adminLimiter,
  adminMutationLimiter,
  feedbackLimiter,
  uploadLimiter,
  searchLogLimiter,
};
