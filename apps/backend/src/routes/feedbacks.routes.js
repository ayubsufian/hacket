const { Router } = require('express');
const Joi = require('joi');
const feedbacksController = require('../controllers/feedbacks.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router({ mergeParams: true });

const ratingSchema = Joi.object({
  orgRating: Joi.number().integer().min(1).max(5).required(),
  rulesRating: Joi.number().integer().min(1).max(5).required(),
  judgingRating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().allow(null, ''),
});

router.use(authenticate);

router.post(
  '/',
  validate(ratingSchema),
  feedbacksController.submitRating
);

module.exports = router;
