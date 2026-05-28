// =============================================================================
// HackET — Analytics Routes
// GET /api/v1/analytics/:hackathonId/report         — Get JSON report
// GET /api/v1/analytics/:hackathonId/export?format=  — Export PDF/CSV
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const analyticsController = require('../controllers/analytics.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

const router = Router();

// ── Public Telemetry Routes (UC0025) ────────────────────────────────────

const translationErrorSchema = Joi.object({
  key: Joi.string().required(),
  language: Joi.string().required(),
  url: Joi.string().uri().allow(null, '')
});

router.post(
  '/translation-errors',
  validate(translationErrorSchema),
  analyticsController.logTranslationError
);

// ── Authenticated Routes ────────────────────────────────────────────────

router.use(authenticate);
router.use(authorize('ORGANIZER', 'ADMIN'));

router.get('/:hackathonId/report', analyticsController.getReport);
router.get('/:hackathonId/export', analyticsController.exportReport);

module.exports = router;
