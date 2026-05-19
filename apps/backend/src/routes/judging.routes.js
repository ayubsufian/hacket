// =============================================================================
// HackET — Judging Routes
// POST /api/v1/judging/scores                            — Submit score
// POST /api/v1/judging/normalize/:hackathonId            — Trigger normalization
// GET  /api/v1/judging/leaderboard/:hackathonId          — Get leaderboard
// GET  /api/v1/judging/breakdown/:submissionId           — Score breakdown
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const judgingController = require('../controllers/judging.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const authorizeEventStaff = require('../middleware/authorizeEventStaff');
const validate = require('../middleware/validate');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const scoreSchema = Joi.object({
  submissionId: Joi.string().uuid().required(),
  criteriaId: Joi.string().uuid().required(),
  value: Joi.number().min(0).required(),
  comment: Joi.string().max(1000).allow(null, ''),
});

const criteriaSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500).allow(null, ''),
  maxScore: Joi.number().min(1).max(100).default(10),
  weight: Joi.number().min(0).max(10).default(1.0),
  sortOrder: Joi.number().integer().default(0),
});

// ── Routes ──────────────────────────────────────────────────────────────

router.use(authenticate);

// --- Criteria Management (Technical Lead & Co-Organizer) ---
router.post(
  '/criteria/:hackathonId',
  authorizeEventStaff('CO_ORGANIZER', 'TECHNICAL_LEAD'),
  validate(criteriaSchema),
  judgingController.addCriteria
);

router.delete(
  '/criteria/:id',
  judgingController.removeCriteria
);

// Judges submit scores
router.post(
  '/scores',
  validate(scoreSchema),
  judgingController.submitScore
);

// Admin/Organizer triggers normalization
router.post(
  '/normalize/:hackathonId',
  authorizeEventStaff('CO_ORGANIZER', 'TECHNICAL_LEAD'),
  judgingController.normalizeScores
);

// Organizer triggers feedback release (AF2)
router.post(
  '/release-feedback/:hackathonId',
  authorizeEventStaff('CO_ORGANIZER', 'COMMUNICATIONS'),
  judgingController.releaseFeedback
);

// Leaderboard (authenticated users can view)
router.get('/leaderboard/:hackathonId', judgingController.getLeaderboard);

// Score breakdown (judges, organizers, and participants)
// Authorization logic is handled dynamically in the service layer to ensure they belong to the specific event
router.get(
  '/breakdown/:submissionId',
  judgingController.getScoreBreakdown
);

module.exports = router;
