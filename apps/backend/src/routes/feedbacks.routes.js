const { Router } = require('express');
const Joi = require('joi');
const feedbacksController = require('../controllers/feedbacks.controller');
const authenticate = require('../middleware/auth');
const ensureVerified = require('../middleware/ensureVerified');
const validate = require('../middleware/validate');
const authorizeEventStaff = require('../middleware/authorizeEventStaff');
const { feedbackLimiter } = require('../middleware/rateLimiter');

const router = Router({ mergeParams: true });

const ratingSchema = Joi.object({
  orgRating: Joi.number().integer().min(1).max(5).required(),
  rulesRating: Joi.number().integer().min(1).max(5).required(),
  judgingRating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().allow(null, ''),
});

router.use(authenticate);

router.get('/my', feedbacksController.getMyFeedback);
router.get('/summary', authorizeEventStaff('CO_ORGANIZER', 'COMMUNICATIONS'), feedbacksController.getSummary);
router.get('/export', authorizeEventStaff('CO_ORGANIZER', 'COMMUNICATIONS'), feedbacksController.exportCsv);
router.get('/', authorizeEventStaff('CO_ORGANIZER', 'COMMUNICATIONS'), feedbacksController.listFeedback);

router.post(
  '/',
  ensureVerified,
  feedbackLimiter,
  validate(ratingSchema),
  feedbacksController.submitRating
);

module.exports = router;
