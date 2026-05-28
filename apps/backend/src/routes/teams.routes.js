// =============================================================================
// HackET - Teams Routes
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const teamsController = require('../controllers/teams.controller');
const authenticate = require('../middleware/auth');
const ensureVerified = require('../middleware/ensureVerified');
const ensureProfileComplete = require('../middleware/ensureProfileComplete');
const validate = require('../middleware/validate');
const { invitationLimiter } = require('../middleware/rateLimiter');

const router = Router();

const createSchema = Joi.object({
  hackathonId: Joi.string().uuid().required(),
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000).allow(null, ''),
  neededSkills: Joi.array().items(Joi.string().max(100)).max(20).default([]),
});

const updateSchema = Joi.object({
  name: Joi.string().min(2).max(255),
  description: Joi.string().max(1000).allow(null, ''),
  neededSkills: Joi.array().items(Joi.string().max(100)).max(20),
  isOpen: Joi.boolean(),
}).min(1);

const inviteSchema = Joi.object({
  receiverId: Joi.string().uuid().required(),
  message: Joi.string().max(500).allow(null, ''),
});

const requestSchema = Joi.object({
  message: Joi.string().max(500).allow(null, ''),
});

const respondSchema = Joi.object({
  accept: Joi.boolean().required(),
});

const transferLeadershipSchema = Joi.object({
  newLeaderUserId: Joi.string().uuid().required(),
});

router.use(authenticate);

router.get('/invitations', teamsController.listUserInvitations);
router.post('/invitations/:id/respond', validate(respondSchema), teamsController.respondToInvitation);

router.get('/', teamsController.list);
router.post('/', ensureVerified, ensureProfileComplete, validate(createSchema), teamsController.create);

router.get('/:id/invitations', teamsController.listTeamInvitations);
router.delete('/:id/invitations/:invitationId', teamsController.cancelInvitation);

router.post(
  '/:id/invite',
  ensureVerified,
  ensureProfileComplete,
  invitationLimiter,
  validate(inviteSchema),
  teamsController.sendInvitation
);

router.post(
  '/:id/request',
  ensureVerified,
  ensureProfileComplete,
  validate(requestSchema),
  teamsController.requestToJoin
);

router.post(
  '/:id/transfer-leadership',
  validate(transferLeadershipSchema),
  teamsController.transferLeadership
);

router.delete('/:id/members/:userId', teamsController.kickMember);
router.post('/:id/leave', teamsController.leave);
router.put('/:id', validate(updateSchema), teamsController.update);
router.get('/:id', teamsController.getById);
router.delete('/:id', teamsController.disband);

module.exports = router;
