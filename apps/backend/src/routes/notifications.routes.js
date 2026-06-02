// =============================================================================
// HackET — Notifications Routes
// GET   /api/v1/notifications              — Get user notifications
// PATCH /api/v1/notifications/:id/read     — Mark as read
// PATCH /api/v1/notifications/read-all     — Mark all as read
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const notificationsController = require('../controllers/notifications.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const authorizeEventStaff = require('../middleware/authorizeEventStaff');

const router = Router();

const preferenceSchema = Joi.object({
  email: Joi.boolean(),
  push: Joi.boolean(),
  sms: Joi.boolean(),
  inApp: Joi.boolean(),
  types: Joi.array().items(Joi.string().max(80)).max(100),
}).min(1);

const broadcastSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
  message: Joi.string().trim().min(2).max(5000).required(),
  type: Joi.string()
    .valid('DEADLINE_REMINDER', 'DEADLINE_WARNING', 'TEAM_INVITE', 'SCORE_PUBLISHED', 'CERTIFICATE_ISSUED', 'ANNOUNCEMENT', 'SYSTEM_ALERT')
    .default('ANNOUNCEMENT'),
});

const cancelSchema = Joi.object({
  reason: Joi.string().trim().max(1000).allow(null, ''),
});

const eventParamSchema = Joi.object({
  eventId: Joi.string().uuid().required(),
});

const broadcastParamSchema = Joi.object({
  broadcastId: Joi.string().uuid().required(),
});

router.use(authenticate);

router.get('/', notificationsController.getNotifications);
router.get('/preferences', notificationsController.getPreferences);
router.patch('/preferences', validate(preferenceSchema), notificationsController.updatePreferences);
router.patch('/read-all', notificationsController.markAllAsRead);
router.patch('/:id/read', notificationsController.markAsRead);

// Sponsor/Communications triggers broadcast announcements
router.get(
  '/broadcasts/:eventId',
  validate(eventParamSchema, 'params'),
  authorizeEventStaff('CO_ORGANIZER', 'COMMUNICATIONS'),
  notificationsController.listBroadcasts
);

router.post(
  '/broadcast/:eventId',
  validate(eventParamSchema, 'params'),
  authorizeEventStaff('CO_ORGANIZER', 'COMMUNICATIONS'),
  validate(broadcastSchema),
  notificationsController.createBroadcast
);

router.post(
  '/broadcasts/:eventId',
  validate(eventParamSchema, 'params'),
  authorizeEventStaff('CO_ORGANIZER', 'COMMUNICATIONS'),
  validate(broadcastSchema),
  notificationsController.createBroadcast
);

router.delete(
  '/broadcasts/:broadcastId',
  validate(broadcastParamSchema, 'params'),
  validate(cancelSchema),
  notificationsController.cancelBroadcast
);

module.exports = router;
