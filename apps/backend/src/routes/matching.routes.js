// =============================================================================
// HackET - Matching & Recommendation Routes
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const matchingController = require('../controllers/matching.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

const autoMatchSchema = Joi.object({
  skills: Joi.alternatives().try(
    Joi.array().items(Joi.string().max(100)).max(20),
    Joi.string().max(1000)
  ),
});

router.use(authenticate);

router.get('/recommendations', matchingController.getRecommendations);
router.get('/recommendations/generate', matchingController.recommendEvents);
router.patch('/recommendations/:id/view', matchingController.markRecommendationViewed);
router.patch('/recommendations/:id/dismiss', matchingController.dismissRecommendation);

router.get('/teams/:hackathonId', matchingController.suggestTeams);
router.get('/members/:teamId', matchingController.suggestMembers);
router.post('/auto-match/:hackathonId', validate(autoMatchSchema), matchingController.autoMatch);

module.exports = router;
