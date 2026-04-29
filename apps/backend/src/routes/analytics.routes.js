// =============================================================================
// HackET — Analytics Routes
// GET /api/v1/analytics/:hackathonId/report         — Get JSON report
// GET /api/v1/analytics/:hackathonId/export?format=  — Export PDF/CSV
// =============================================================================

const { Router } = require('express');
const analyticsController = require('../controllers/analytics.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.use(authenticate);
router.use(authorize('ORGANIZER', 'ADMIN'));

router.get('/:hackathonId/report', analyticsController.getReport);
router.get('/:hackathonId/export', analyticsController.exportReport);

module.exports = router;
