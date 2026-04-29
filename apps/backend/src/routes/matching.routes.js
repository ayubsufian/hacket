// =============================================================================
// HackET — Matching & Recommendation Routes
// GET /api/v1/matching/teams/:hackathonId        — Suggest teams for a user
// GET /api/v1/matching/members/:teamId            — Suggest members for a team
// GET /api/v1/matching/recommendations            — Recommend events to user
// =============================================================================

const { Router } = require('express');
const matchingController = require('../controllers/matching.controller');
const authenticate = require('../middleware/auth');

const router = Router();

router.use(authenticate);

router.get('/teams/:hackathonId', matchingController.suggestTeams);
router.get('/members/:teamId', matchingController.suggestMembers);
router.get('/recommendations', matchingController.recommendEvents);

module.exports = router;
