// =============================================================================
// HackET - Submissions Routes
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const submissionsController = require('../controllers/submissions.controller');
const authenticate = require('../middleware/auth');
const ensureVerified = require('../middleware/ensureVerified');
const ensureProfileComplete = require('../middleware/ensureProfileComplete');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');

const router = Router();

const upload = multer({
  dest: path.join(__dirname, '../../../uploads'),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const uploadMiddleware = (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      return next(new AppError('A required file failed to upload due to network interruption or size limit.', 400));
    }
    next();
  });
};

const fileUrlSchema = Joi.string().max(2048);

const upsertSchema = Joi.object({
  teamId: Joi.string().uuid().required(),
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(5000).allow(null, ''),
  githubUrl: Joi.string().uri().allow(null, ''),
  videoUrl: Joi.string().uri().allow(null, ''),
  demoUrl: Joi.string().uri().allow(null, ''),
  slidesUrl: Joi.string().uri().allow(null, ''),
  fileUrls: Joi.array().items(fileUrlSchema).max(10).default([]),
});

const patchSchema = Joi.object({
  title: Joi.string().min(3).max(255),
  description: Joi.string().max(5000).allow(null, ''),
  githubUrl: Joi.string().uri().allow(null, ''),
  videoUrl: Joi.string().uri().allow(null, ''),
  demoUrl: Joi.string().uri().allow(null, ''),
  slidesUrl: Joi.string().uri().allow(null, ''),
  fileUrls: Joi.array().items(fileUrlSchema).max(10),
}).min(1);

router.use(authenticate);

router.post('/', ensureVerified, ensureProfileComplete, uploadMiddleware, validate(upsertSchema), submissionsController.upsert);

router.get('/me', submissionsController.listMine);
router.get('/hackathon/:hackathonId', submissionsController.listByHackathon);

router.get('/:id/history', submissionsController.getHistory);
router.get('/:id/files', submissionsController.getFiles);
router.post('/:id/submit', ensureVerified, ensureProfileComplete, submissionsController.submit);
router.patch('/:id', ensureVerified, ensureProfileComplete, validate(patchSchema), submissionsController.patch);
router.delete('/:id', ensureVerified, ensureProfileComplete, submissionsController.withdraw);
router.get('/:id', submissionsController.getById);

module.exports = router;
