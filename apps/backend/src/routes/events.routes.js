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
  status: Joi.string().valid('DRAFT').default('DRAFT').messages({
    'any.only': 'New hackathons must start as DRAFT. Use explicit transition endpoints to publish or change state.',
  }),
  overrideConflict: Joi.boolean().default(false),
  titleAm: Joi.string().max(255).allow(null, ''),
  description: Joi.string().allow(null, ''),
  descriptionAm: Joi.string().allow(null, ''),
  coverImageUrl: Joi.string().uri().allow(null, ''),
  maxTeamSize: Joi.number().integer().min(1).max(20).default(5),
  minTeamSize: Joi.number().integer().min(1).max(20).default(1),
  maxParticipants: Joi.number().integer().min(1).allow(null),
  waitlistEnabled: Joi.boolean().default(true),
  waitlistLimit: Joi.number().integer().min(1).allow(null),
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
  waitlistEnabled: Joi.boolean(),
  waitlistLimit: Joi.number().integer().min(1).allow(null),
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

const registrationSchema = Joi.object({
  inviteToken: Joi.string().max(500).allow(null, ''),
});

const validateEventShape = (value, helpers) => {
  if (value.minTeamSize && value.maxTeamSize && value.minTeamSize > value.maxTeamSize) {
    return helpers.error('any.custom', { message: 'minTeamSize cannot be greater than maxTeamSize.' });
  }

  const datePairs = [
    ['registrationStart', 'registrationEnd', 'registrationEnd must be after registrationStart.'],
    ['eventStart', 'eventEnd', 'eventEnd must be after eventStart.'],
    ['judgingStart', 'judgingEnd', 'judgingEnd must be after judgingStart.'],
  ];

  for (const [startField, endField, message] of datePairs) {
    if (value[startField] && value[endField] && new Date(value[endField]) <= new Date(value[startField])) {
      return helpers.error('any.custom', { message });
    }
  }

  if (value.registrationEnd && value.eventStart && new Date(value.eventStart) < new Date(value.registrationEnd)) {
    return helpers.error('any.custom', { message: 'eventStart must be after registrationEnd.' });
  }

  if (value.eventStart && value.submissionDeadline && new Date(value.submissionDeadline) <= new Date(value.eventStart)) {
    return helpers.error('any.custom', { message: 'submissionDeadline must be after eventStart.' });
  }

  if (value.submissionDeadline && value.judgingStart && new Date(value.judgingStart) < new Date(value.submissionDeadline)) {
    return helpers.error('any.custom', { message: 'judgingStart must be after submissionDeadline.' });
  }

  if (value.submissionDeadline && value.judgingEnd && new Date(value.judgingEnd) <= new Date(value.submissionDeadline)) {
    return helpers.error('any.custom', { message: 'judgingEnd must be after submissionDeadline.' });
  }

  return value;
};

const eventCreateSchema = createSchema.custom(validateEventShape);
const eventUpdateSchema = updateSchema.custom(validateEventShape);

// ── Routes ──────────────────────────────────────────────────────────────

// Public discovery
router.get('/', eventsController.list);
router.get('/:id', eventsController.getById);
router.get('/:id/calendar', eventsController.getCalendar);

// Sponsor, Organizer, & Logistics Data Access
router.get(
  '/:id/participants',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
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
  validate(eventCreateSchema),
  eventsController.create
);

router.put(
  '/:id',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('CO_ORGANIZER', 'TECHNICAL_LEAD', 'COMMUNICATIONS', 'LOGISTICS', 'FINANCE'),
  validate(eventUpdateSchema),
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
  validate(registrationSchema),
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
  authorizeEventStaff('ADMIN', 'CO_ORGANIZER'),
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
  ensureVerified,
  ensureProfileComplete,
  eventsController.getContext
);

// Live Event Quick Stats
router.get(
  '/:id/stats',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('CO_ORGANIZER', 'TECHNICAL_LEAD', 'LOGISTICS'),
  eventsController.getStats
);

module.exports = router;
