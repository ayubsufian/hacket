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
  preferredAt: Joi.date().iso().allow(null),
});

const logSchema = Joi.object({
  teamId: Joi.string().uuid().required(),
  durationMinutes: Joi.number().integer().min(1).max(1440).required(),
  notes: Joi.string().required(),
});

const respondSchema = Joi.object({
  status: Joi.string().valid('ACCEPTED', 'DECLINED').required(),
});

const sessionSchema = Joi.object({
  mentorId: Joi.string().uuid().required(),
  teamId: Joi.string().uuid().required(),
  startAt: Joi.date().iso().required(),
  durationMinutes: Joi.number().integer().min(15).max(240).required(),
  agenda: Joi.string().max(1000).allow(null, ''),
});

router.use(authenticate);

router.get('/mentors/:hackathonId', mentorshipController.findMentors);

router.post(
  '/requests',
  authorize('PARTICIPANT'),
  validate(requestSchema),
  mentorshipController.requestMentor
);
router.get('/requests/incoming', mentorshipController.getIncomingRequests);
router.get('/requests/outgoing', mentorshipController.getOutgoingRequests);
router.delete('/requests/:requestId', mentorshipController.cancelRequest);
router.patch('/requests/:requestId/respond', validate(respondSchema), mentorshipController.respondToRequest);

router.get('/assignments', mentorshipController.getAssignments);
router.patch('/assignments/:id/deactivate', mentorshipController.deactivateAssignment);

router.get('/interactions', mentorshipController.getInteractions);
router.post('/interactions', validate(logSchema), mentorshipController.logInteraction);

router.post('/sessions', validate(sessionSchema), mentorshipController.createSession);

module.exports = router;
