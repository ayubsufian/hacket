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
const validate = require('../middleware/validate');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const scoreSchema = Joi.object({
  submissionId: Joi.string().uuid().required(),
  criteriaId: Joi.string().uuid().required(),
  value: Joi.number().min(0).required(),
  comment: Joi.string().max(1000).allow(null, ''),
});

// ── Routes ──────────────────────────────────────────────────────────────

router.use(authenticate);

// Judges submit scores
router.post(
  '/scores',
  authorize('JUDGE', 'ADMIN'),
  validate(scoreSchema),
  judgingController.submitScore
);

// Admin/Organizer triggers normalization
router.post(
  '/normalize/:hackathonId',
  authorize('ORGANIZER', 'ADMIN'),
  judgingController.normalizeScores
);

// Leaderboard (authenticated users can view)
router.get('/leaderboard/:hackathonId', judgingController.getLeaderboard);

// Score breakdown (judges and organizers)
router.get(
  '/breakdown/:submissionId',
  authorize('JUDGE', 'ORGANIZER', 'ADMIN'),
  judgingController.getScoreBreakdown
);

module.exports = router;
