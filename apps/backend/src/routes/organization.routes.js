// =============================================================================
// HackET — Organization Routes
// GET   /api/v1/organizations/me
// PATCH /api/v1/organizations/me
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const organizationController = require('../controllers/organization.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const updateOrganizationSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  nameAm: Joi.string().max(255).allow(null, ''),
  description: Joi.string().allow(null, ''),
  descriptionAm: Joi.string().allow(null, ''),
  logoUrl: Joi.string().uri().allow(null, ''),
  websiteUrl: Joi.string().uri().allow(null, ''),
  contactEmail: Joi.string().email().required(),
  city: Joi.string().max(100).allow(null, ''),
  region: Joi.string().max(100).allow(null, ''),
});

// ── Routes ──────────────────────────────────────────────────────────────

router.use(authenticate); // Protect all organization routes

router.get('/me', organizationController.getMe);
router.patch('/me', validate(updateOrganizationSchema), organizationController.updateMe);

module.exports = router;
