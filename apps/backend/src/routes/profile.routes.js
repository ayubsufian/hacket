// =============================================================================
// HackET — Profile Routes
// GET   /api/v1/profile/me
// PATCH /api/v1/profile/me
// GET   /api/v1/profile/participation/:hackathonId
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const profileController = require('../controllers/profile.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(100),
  lastName: Joi.string().min(1).max(100),
  bio: Joi.string().max(1000).allow(null, ''),
  avatarUrl: Joi.string().uri().allow(null, ''),
  phone: Joi.string().max(50).allow(null, ''),
  university: Joi.string().max(255).allow(null, ''),
  graduationYear: Joi.number().integer().min(1900).max(2100).allow(null),
  skills: Joi.array().items(Joi.string().max(50)).max(50),
  interests: Joi.array().items(Joi.string().max(50)).max(50),
  githubUrl: Joi.string().uri().allow(null, ''),
  linkedinUrl: Joi.string().uri().allow(null, ''),
  preferredLocale: Joi.string().valid('en', 'am').default('en'),
  city: Joi.string().max(100).allow(null, ''),
  region: Joi.string().max(100).allow(null, ''),
  dateOfBirth: Joi.date().iso().allow(null),
  isSeekingTeam: Joi.boolean(),
}).min(1); // Require at least one field to be updated

// ── Routes ──────────────────────────────────────────────────────────────

router.use(authenticate); // Protect all profile routes

router.get('/me', profileController.getMe);
router.patch('/me', validate(updateProfileSchema), profileController.updateProfile);
router.get('/participation/:hackathonId', profileController.getParticipationDetails);

module.exports = router;
