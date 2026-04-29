// =============================================================================
// HackET — Submissions Routes
// POST /api/v1/submissions                         — Create/update submission
// POST /api/v1/submissions/:id/submit              — Finalize submission
// GET  /api/v1/submissions/:id                     — Get submission
// GET  /api/v1/submissions/hackathon/:hackathonId   — List by hackathon
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const submissionsController = require('../controllers/submissions.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const upsertSchema = Joi.object({
  teamId: Joi.string().uuid().required(),
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(5000).allow(null, ''),
  githubUrl: Joi.string().uri().allow(null, ''),
  videoUrl: Joi.string().uri().allow(null, ''),
  demoUrl: Joi.string().uri().allow(null, ''),
  slidesUrl: Joi.string().uri().allow(null, ''),
  fileUrls: Joi.array().items(Joi.string().uri()).max(10).default([]),
});

// ── Routes ──────────────────────────────────────────────────────────────

router.use(authenticate);

router.post('/', validate(upsertSchema), submissionsController.upsert);
router.post('/:id/submit', submissionsController.submit);
router.get('/:id', submissionsController.getById);
router.get('/hackathon/:hackathonId', submissionsController.listByHackathon);

module.exports = router;
