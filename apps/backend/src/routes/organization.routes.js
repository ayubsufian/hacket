// =============================================================================
// HackET — Organization Routes
// GET   /api/v1/organizations/me
// PATCH /api/v1/organizations/me
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const multer = require('multer');
const organizationController = require('../controllers/organization.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { tmpUploadsRoot } = require('../utils/paths');

const router = Router();
const upload = multer({
  dest: tmpUploadsRoot,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      return cb(new Error('Logo must be a JPEG, PNG, WebP, or GIF image.'));
    }
    cb(null, true);
  },
});

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

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// ── Routes ──────────────────────────────────────────────────────────────

router.get('/', organizationController.listPublic);
router.get('/me', authenticate, organizationController.getMe);
router.patch('/me', authenticate, validate(updateOrganizationSchema), organizationController.updateMe);
router.post('/me/logo', authenticate, upload.single('logo'), organizationController.uploadLogo);
router.get('/:id/hackathons', validate(idParamSchema, 'params'), organizationController.listHackathons);
router.get('/:id', validate(idParamSchema, 'params'), organizationController.getPublicById);

module.exports = router;
