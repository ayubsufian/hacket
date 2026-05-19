// =============================================================================
// HackET — Auth Routes
// POST /api/v1/auth/register
// POST /api/v1/auth/login
// POST /api/v1/auth/logout
// GET  /api/v1/auth/me
// POST /api/v1/auth/forgot-password
// POST /api/v1/auth/reset-password
// POST /api/v1/auth/verify-email
// POST /api/v1/auth/resend-verification-email
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/)
    .required()
    .messages({
      'string.pattern.base':
        'Your password is too weak. Please use at least 8 characters and include uppercase letters, lowercase letters, numbers, and special symbols.',
      'string.min':
        'Your password is too weak. Please use at least 8 characters and include uppercase letters, lowercase letters, numbers, and special symbols.',
    }),
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),

  role: Joi.string()
    .valid('PARTICIPANT', 'ORGANIZER')
    .default('PARTICIPANT'),

  // Organizer institutional verification fields (UC0001)
  organizationName: Joi.string().min(2).max(255)
    .when('role', { is: 'ORGANIZER', then: Joi.required(), otherwise: Joi.forbidden() })
    .messages({
      'any.required': 'Organization name is required for Organizer accounts.',
    }),
  representativeName: Joi.string().min(2).max(255)
    .when('role', { is: 'ORGANIZER', then: Joi.optional(), otherwise: Joi.forbidden() }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const googleOAuthSchema = Joi.object({
  code: Joi.string().trim().min(1).required(),
  redirectUri: Joi.string().uri().optional(),
  codeVerifier: Joi.string().min(43).max(128).optional(),
});

const googleOrganizerOAuthSchema = googleOAuthSchema.keys({
  organizationName: Joi.string().min(2).max(255).required()
    .messages({ 'any.required': 'Organization name is required for Organizer accounts.' }),
  representativeName: Joi.string().min(2).max(255).optional(),
});

const githubOAuthSchema = Joi.object({
  code: Joi.string().trim().min(1).required(),
});

const githubOrganizerOAuthSchema = githubOAuthSchema.keys({
  organizationName: Joi.string().min(2).max(255).required()
    .messages({ 'any.required': 'Organization name is required for Organizer accounts.' }),
  representativeName: Joi.string().min(2).max(255).optional(),
});

const verifyEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().pattern(/^\d{6}$/).required()
    .messages({ 'string.pattern.base': 'OTP must be a 6-digit code.' }),
});

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().pattern(/^\d{6}$/).required()
    .messages({ 'string.pattern.base': 'OTP must be a 6-digit code.' }),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/)
    .required()
    .messages({
      'string.pattern.base':
        'Your password is too weak. Please use at least 8 characters and include uppercase letters, lowercase letters, numbers, and special symbols.',
      'string.min':
        'Your password is too weak. Please use at least 8 characters and include uppercase letters, lowercase letters, numbers, and special symbols.',
    }),
});

const submitVerificationSchema = Joi.object({
  verificationDocUrl: Joi.string().uri().required()
    .messages({ 'any.required': 'Verification document URL is required.' }),
});

// ── Routes ──────────────────────────────────────────────────────────────

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification-email', authLimiter, validate(resendVerificationSchema), authController.resendVerificationEmail);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/oauth/google', authLimiter, validate(googleOAuthSchema), authController.googleOAuth);
router.post('/oauth/google/organizer', authLimiter, validate(googleOrganizerOAuthSchema), authController.googleOrganizerOAuth);
router.post('/oauth/github', authLimiter, validate(githubOAuthSchema), authController.githubOAuth);
router.post('/oauth/github/organizer', authLimiter, validate(githubOrganizerOAuthSchema), authController.githubOrganizerOAuth);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/extend-session', authenticate, authController.extendSession);
router.post('/submit-verification', authenticate, validate(submitVerificationSchema), authController.submitVerification);

// ── Role Upgrade: Participant → Organizer ───────────────────────────────

const upgradeSchema = Joi.object({
  organizationName: Joi.string().min(2).max(255).required()
    .messages({ 'any.required': 'Organization name is required to become an Organizer.' }),
  representativeName: Joi.string().min(2).max(255).allow(null, ''),
});

router.post(
  '/request-organizer-upgrade',
  authenticate,
  validate(upgradeSchema),
  authController.requestOrganizerUpgrade
);

module.exports = router;
