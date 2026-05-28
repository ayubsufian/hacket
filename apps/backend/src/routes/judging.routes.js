// =============================================================================
// HackET - Judging Routes
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const judgingController = require('../controllers/judging.controller');
const authenticate = require('../middleware/auth');
const authorizeEventStaff = require('../middleware/authorizeEventStaff');
const validate = require('../middleware/validate');

const router = Router();

const scoreSchema = Joi.object({
  submissionId: Joi.string().uuid().required(),
  criteriaId: Joi.string().uuid().required(),
  value: Joi.number().min(0).required(),
  comment: Joi.string().max(1000).allow(null, ''),
});

const batchScoreSchema = Joi.object({
  scores: Joi.array().items(scoreSchema).min(1).max(100).required(),
});

const criteriaSchema = Joi.object({
  name: Joi.string().max(100).required(),
  nameAm: Joi.string().max(100).allow(null, ''),
  description: Joi.string().max(500).allow(null, ''),
  maxScore: Joi.number().integer().min(1).max(100).default(10),
  weight: Joi.number().min(0).max(10).default(1.0),
  sortOrder: Joi.number().integer().default(0),
});

const criteriaUpdateSchema = Joi.object({
  name: Joi.string().max(100),
  nameAm: Joi.string().max(100).allow(null, ''),
  description: Joi.string().max(500).allow(null, ''),
  maxScore: Joi.number().integer().min(1).max(100),
  weight: Joi.number().min(0).max(10),
  sortOrder: Joi.number().integer(),
}).min(1);

const assignmentSchema = Joi.object({
  assignments: Joi.array().items(
    Joi.object({
      submissionId: Joi.string().uuid().required(),
      judgeId: Joi.string().uuid().required(),
    })
  ).required(),
});

router.use(authenticate);

router.get('/criteria/:id', judgingController.getCriteria);
router.post(
  '/criteria/:hackathonId',
  authorizeEventStaff('CO_ORGANIZER', 'TECHNICAL_LEAD'),
  validate(criteriaSchema),
  judgingController.addCriteria
);
router.put('/criteria/:id', validate(criteriaUpdateSchema), judgingController.updateCriteria);
router.delete('/criteria/:id', judgingController.removeCriteria);

router.put(
  '/assignments/:hackathonId',
  authorizeEventStaff('CO_ORGANIZER', 'TECHNICAL_LEAD'),
  validate(assignmentSchema),
  judgingController.setAssignments
);
router.get(
  '/assignments/:hackathonId',
  authorizeEventStaff('CO_ORGANIZER', 'TECHNICAL_LEAD', 'JUDGE'),
  judgingController.getAssignments
);
router.delete('/assignments/:assignmentId', judgingController.deleteAssignment);

router.get('/scores/me', judgingController.getMyScores);
router.post('/scores/batch', validate(batchScoreSchema), judgingController.submitBatchScores);
router.post('/scores', validate(scoreSchema), judgingController.submitScore);

router.post(
  '/normalize/:hackathonId',
  authorizeEventStaff('CO_ORGANIZER', 'TECHNICAL_LEAD'),
  judgingController.normalizeScores
);

router.post(
  '/release-feedback/:hackathonId',
  authorizeEventStaff('CO_ORGANIZER', 'COMMUNICATIONS'),
  judgingController.releaseFeedback
);

router.get('/review-progress/:hackathonId', judgingController.getReviewProgress);
router.get('/leaderboard/:hackathonId', judgingController.getLeaderboard);
router.get('/breakdown/:submissionId', judgingController.getScoreBreakdown);

module.exports = router;
