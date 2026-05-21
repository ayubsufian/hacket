// =============================================================================
// HackET — Events (Hackathon) Routes
// GET    /api/v1/events              — List/discover hackathons
// POST   /api/v1/events              — Create hackathon (Organizer/Admin)
// GET    /api/v1/events/:id          — Get hackathon details
// PUT    /api/v1/events/:id          — Update hackathon (Organizer)
// DELETE /api/v1/events/:id          — Delete hackathon (Organizer)
// POST   /api/v1/events/:id/register — Register as participant
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const eventsController = require('../controllers/events.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const authorizeEventStaff = require('../middleware/authorizeEventStaff');
const ensureVerified = require('../middleware/ensureVerified');
const ensureProfileComplete = require('../middleware/ensureProfileComplete');
const validate = require('../middleware/validate');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const createSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  status: Joi.string().valid('DRAFT', 'UPCOMING', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'JUDGING', 'COMPLETED', 'CANCELLED', 'SUSPENDED', 'ARCHIVED').default('DRAFT'),
  overrideConflict: Joi.boolean().default(false),
  titleAm: Joi.string().max(255).allow(null, ''),
  description: Joi.string().allow(null, ''),
  descriptionAm: Joi.string().allow(null, ''),
  coverImageUrl: Joi.string().uri().allow(null, ''),
  maxTeamSize: Joi.number().integer().min(1).max(20).default(5),
  minTeamSize: Joi.number().integer().min(1).max(20).default(1),
  maxParticipants: Joi.number().integer().min(1).allow(null),
  registrationStart: Joi.date().iso().allow(null),
  registrationEnd: Joi.date().iso().greater(Joi.ref('registrationStart')).allow(null),
  eventStart: Joi.date().iso().allow(null),
  eventEnd: Joi.date().iso().greater(Joi.ref('eventStart')).allow(null),
  submissionDeadline: Joi.date().iso().allow(null),
  judgingStart: Joi.date().iso().allow(null),
  judgingEnd: Joi.date().iso().allow(null),
  judgingMode: Joi.string()
    .valid('ALL_JUDGES_ALL_SUBMISSIONS', 'ASSIGNED_JUDGES', 'MINIMUM_REVIEWS')
    .default('MINIMUM_REVIEWS'),
  requiredReviewsPerSubmission: Joi.number().integer().min(1).max(50).default(3),
  rules: Joi.string().allow(null, ''),
  rulesAm: Joi.string().allow(null, ''),
  prizes: Joi.object().allow(null),
  prerequisites: Joi.object().allow(null),
  region: Joi.string().max(100).allow(null, ''),
  venue: Joi.string().allow(null, ''),
  isVirtual: Joi.boolean().default(false),
  websiteUrl: Joi.string().uri().allow(null, ''),
  contactEmail: Joi.string().email().allow(null, ''),
  tags: Joi.array().items(Joi.string().max(100)).max(20),
});

const updateSchema = createSchema.fork(
  ['title'],
  (field) => field.optional()
).keys({
  judgingMode: Joi.string()
    .valid('ALL_JUDGES_ALL_SUBMISSIONS', 'ASSIGNED_JUDGES', 'MINIMUM_REVIEWS'),
  requiredReviewsPerSubmission: Joi.number().integer().min(1).max(50),
  status: Joi.forbidden().messages({
    'any.unknown': 'Status updates must be performed via explicit transition endpoints (e.g., /publish, /complete).'
  })
});

const scheduleUpdateSchema = Joi.object({
  registrationStart: Joi.date().iso().required(),
  registrationEnd: Joi.date().iso().greater(Joi.ref('registrationStart')).required(),
  eventStart: Joi.date().iso().greater(Joi.ref('registrationEnd')).required(),
  eventEnd: Joi.date().iso().greater(Joi.ref('eventStart')).required(),
  submissionDeadline: Joi.date().iso().greater(Joi.ref('eventStart')).required(),
  judgingStart: Joi.date().iso().greater(Joi.ref('submissionDeadline')).allow(null),
  judgingEnd: Joi.date().iso().greater(Joi.ref('submissionDeadline')).required(),
});

const cancelSchema = Joi.object({
  reason: Joi.string().max(500).allow(null, '')
});

const completeSchema = Joi.object({
  reason: Joi.string().trim().max(1000).allow(null, ''),
});

const suspendSchema = Joi.object({
  reason: Joi.string().max(500).required()
});

const kickSchema = Joi.object({
  reason: Joi.string().max(500).required()
});

// ── Routes ──────────────────────────────────────────────────────────────

// Public discovery
router.get('/', eventsController.list);
router.get('/:id', eventsController.getById);
router.get('/:id/calendar', eventsController.getCalendar);

// Sponsor, Organizer, & Logistics Data Access
router.get(
  '/:id/participants',
  authenticate,
  authorizeEventStaff('CO_ORGANIZER', 'SPONSOR', 'TECHNICAL_LEAD', 'LOGISTICS'),
  eventsController.getParticipants
);

// Authenticated
router.post(
  '/',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorize('ORGANIZER', 'ADMIN'),
  validate(createSchema),
  eventsController.create
);

router.put(
  '/:id',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('CO_ORGANIZER', 'TECHNICAL_LEAD', 'COMMUNICATIONS', 'LOGISTICS', 'FINANCE'),
  validate(updateSchema),
  eventsController.update
);

router.put(
  '/:id/schedule',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('CO_ORGANIZER'),
  validate(scheduleUpdateSchema),
  eventsController.updateSchedule
);

router.delete(
  '/:id',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('CO_ORGANIZER'), // Only Primary Organizer or Co-Organizer can delete
  eventsController.remove
);

router.post(
  '/:id/register',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorize('PARTICIPANT', 'ORGANIZER'),
  eventsController.registerParticipant
);

router.delete(
  '/:id/register',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorize('PARTICIPANT', 'ORGANIZER'),
  eventsController.unregisterParticipant
);

router.post(
  '/:id/participants/:userId/check-in',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('LOGISTICS', 'ADMIN', 'CO_ORGANIZER'),
  eventsController.checkInParticipant
);

router.delete(
  '/:id/participants/:userId/check-in',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('LOGISTICS', 'ADMIN', 'CO_ORGANIZER'),
  eventsController.undoCheckIn
);

// Trust & Safety: Organizer-initiated participant removal
router.delete(
  '/:id/participants/:userId',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('ADMIN', 'CO_ORGANIZER'),
  validate(kickSchema),
  eventsController.kickParticipant
);

router.post(
  '/:id/archive',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorize('ORGANIZER', 'ADMIN'),
  eventsController.archive
);

router.post(
  '/:id/clone',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorize('ORGANIZER', 'ADMIN'),
  eventsController.clone
);

// State Machine Transitions
router.post(
  '/:id/publish',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('CO_ORGANIZER', 'TECHNICAL_LEAD'),
  eventsController.publish
);

router.post(
  '/:id/cancel',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('CO_ORGANIZER'),
  validate(cancelSchema),
  eventsController.cancel
);

router.post(
  '/:id/complete',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('CO_ORGANIZER'),
  validate(completeSchema),
  eventsController.complete
);

router.post(
  '/:id/suspend',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('ADMIN', 'CO_ORGANIZER'),
  validate(suspendSchema),
  eventsController.suspend
);

router.post(
  '/:id/resume',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('ADMIN', 'CO_ORGANIZER'),
  eventsController.resume
);

// Unified User Context
router.get(
  '/:id/context',
  authenticate,
  eventsController.getContext
);

// Live Event Quick Stats
router.get(
  '/:id/stats',
  authenticate,
  authorizeEventStaff('CO_ORGANIZER', 'TECHNICAL_LEAD', 'LOGISTICS'),
  eventsController.getStats
);

module.exports = router;
