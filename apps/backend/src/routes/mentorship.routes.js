const { Router } = require('express');
const Joi = require('joi');
const mentorshipController = require('../controllers/mentorship.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

const router = Router();

const requestSchema = Joi.object({
  mentorId: Joi.string().uuid().required(),
  teamId: Joi.string().uuid().required(),
  message: Joi.string().max(1000).allow(null, ''),
});

const logSchema = Joi.object({
  teamId: Joi.string().uuid().required(),
  durationMinutes: Joi.number().integer().min(1).max(1440).required(),
  notes: Joi.string().required(),
});

const respondSchema = Joi.object({
  status: Joi.string().valid('ACCEPTED', 'DECLINED').required(),
});

router.use(authenticate);

// ── Participant Actions ─────────────────────────────────────────────────
router.post(
  '/requests',
  authorize('PARTICIPANT'),
  validate(requestSchema),
  mentorshipController.requestMentor
);

// ── Mentor Actions ──────────────────────────────────────────────────────

// View incoming mentor requests
router.get(
  '/requests/incoming',
  mentorshipController.getIncomingRequests
);

// Accept or decline a mentor request
router.patch(
  '/requests/:requestId/respond',
  validate(respondSchema),
  mentorshipController.respondToRequest
);

// View assigned teams
router.get(
  '/assignments',
  mentorshipController.getAssignments
);

// Log an interaction with a team
router.post(
  '/interactions',
  validate(logSchema),
  mentorshipController.logInteraction
);

module.exports = router;
