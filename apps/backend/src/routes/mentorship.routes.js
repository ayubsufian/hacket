const { Router } = require('express');
const Joi = require('joi');
const mentorshipController = require('../controllers/mentorship.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');

const router = Router();

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

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

router.use(authenticate);

router.post(
  '/requests',
  restrictTo('PARTICIPANT'),
  validate(requestSchema),
  mentorshipController.requestMentor
);

router.post(
  '/interactions',
  restrictTo('MENTOR'),
  validate(logSchema),
  mentorshipController.logInteraction
);

module.exports = router;
