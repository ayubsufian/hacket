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
const validate = require('../middleware/validate');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const createSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  titleAm: Joi.string().max(255).allow(null, ''),
  description: Joi.string().min(10).required(),
  descriptionAm: Joi.string().allow(null, ''),
  coverImageUrl: Joi.string().uri().allow(null, ''),
  maxTeamSize: Joi.number().integer().min(1).max(20).default(5),
  minTeamSize: Joi.number().integer().min(1).max(20).default(1),
  maxParticipants: Joi.number().integer().min(1).allow(null),
  registrationStart: Joi.date().iso().required(),
  registrationEnd: Joi.date().iso().greater(Joi.ref('registrationStart')).required(),
  eventStart: Joi.date().iso().required(),
  eventEnd: Joi.date().iso().greater(Joi.ref('eventStart')).required(),
  submissionDeadline: Joi.date().iso().required(),
  judgingStart: Joi.date().iso().allow(null),
  judgingEnd: Joi.date().iso().allow(null),
  rules: Joi.string().allow(null, ''),
  rulesAm: Joi.string().allow(null, ''),
  prizes: Joi.object().allow(null),
  region: Joi.string().max(100).allow(null, ''),
  venue: Joi.string().allow(null, ''),
  isVirtual: Joi.boolean().default(false),
  websiteUrl: Joi.string().uri().allow(null, ''),
  contactEmail: Joi.string().email().allow(null, ''),
  tags: Joi.array().items(Joi.string().max(100)).max(20),
});

const updateSchema = createSchema.fork(
  [
    'title',
    'description',
    'registrationStart',
    'registrationEnd',
    'eventStart',
    'eventEnd',
    'submissionDeadline',
  ],
  (field) => field.optional()
);

// ── Routes ──────────────────────────────────────────────────────────────

// Public discovery
router.get('/', eventsController.list);
router.get('/:id', eventsController.getById);

// Authenticated
router.post(
  '/',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  validate(createSchema),
  eventsController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  validate(updateSchema),
  eventsController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  eventsController.remove
);

router.post(
  '/:id/register',
  authenticate,
  authorize('PARTICIPANT'),
  eventsController.registerParticipant
);

module.exports = router;
