// =============================================================================
// HackET — Teams Routes
// POST /api/v1/teams                       — Create team
// GET  /api/v1/teams/:id                   — Get team details
// PUT  /api/v1/teams/:id                   — Update team (leader)
// POST /api/v1/teams/:id/invite            — Send invitation
// POST /api/v1/teams/invitations/:id/respond — Accept/decline invite
// POST /api/v1/teams/:id/leave             — Leave team
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const teamsController = require('../controllers/teams.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

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

const respondSchema = Joi.object({
  accept: Joi.boolean().required(),
});

// ── Routes ──────────────────────────────────────────────────────────────

router.use(authenticate); // All team routes require auth

router.post('/', validate(createSchema), teamsController.create);
router.get('/:id', teamsController.getById);
router.put('/:id', validate(updateSchema), teamsController.update);
router.post('/:id/invite', validate(inviteSchema), teamsController.sendInvitation);
router.post(
  '/invitations/:id/respond',
  validate(respondSchema),
  teamsController.respondToInvitation
);
router.post('/:id/leave', teamsController.leave);

module.exports = router;
