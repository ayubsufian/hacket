// =============================================================================
// HackET — Auth Routes
// POST /api/v1/auth/register
// POST /api/v1/auth/login
// POST /api/v1/auth/logout
// GET  /api/v1/auth/me
// POST /api/v1/auth/forgot-password
// POST /api/v1/auth/reset-password
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

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
    .valid('PARTICIPANT', 'ORGANIZER', 'JUDGE', 'MENTOR')
    .default('PARTICIPANT'),

  // Organizer institutional verification fields (UC0001)
  organizationName: Joi.string().min(2).max(255)
    .when('role', { is: 'ORGANIZER', then: Joi.required(), otherwise: Joi.forbidden() })
    .messages({
      'any.required': 'Organization name is required for Organizer accounts.',
    }),
  representativeName: Joi.string().min(2).max(255)
    .when('role', { is: 'ORGANIZER', then: Joi.required(), otherwise: Joi.optional() })
    .messages({
      'any.required': 'Representative name is required for Organizer accounts.',
    }),
  verificationDocUrl: Joi.string().uri()
    .when('role', { is: 'ORGANIZER', then: Joi.required(), otherwise: Joi.forbidden() })
    .messages({
      'any.required': 'Verification document URL is required for Organizer accounts.',
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
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

// ── Routes ──────────────────────────────────────────────────────────────

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
