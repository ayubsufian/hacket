// =============================================================================
// HackET — Profile Routes
// GET   /api/v1/profile/me
// PATCH /api/v1/profile/me
// GET   /api/v1/profile/participation/:hackathonId
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const multer = require('multer');
const profileController = require('../controllers/profile.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();
const upload = multer({
  dest: 'uploads/tmp',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      return cb(new Error('Avatar must be a JPEG, PNG, WebP, or GIF image.'));
    }
    cb(null, true);
  },
});

// ── Validation Schemas ──────────────────────────────────────────────────

const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).invalid('New'),
  lastName: Joi.string().trim().min(1).max(100).invalid('User'),
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
router.post('/me/avatar', upload.single('avatar'), profileController.uploadAvatar);
router.get('/me/teams', profileController.getMyTeams);
router.get('/participation/:hackathonId', profileController.getParticipationDetails);
router.get('/:userId', profileController.getPublicProfile);

module.exports = router;
