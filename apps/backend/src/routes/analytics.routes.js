// =============================================================================
// HackET — Analytics Routes
// GET /api/v1/analytics/:hackathonId/report         — Get JSON report
// GET /api/v1/analytics/:hackathonId/export?format=  — Export PDF/CSV
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const analyticsController = require('../controllers/analytics.controller');
const authenticate = require('../middleware/auth');
const authorizeEventStaff = require('../middleware/authorizeEventStaff');
const validate = require('../middleware/validate');

const router = Router();

const hackathonParamSchema = Joi.object({
  hackathonId: Joi.string().uuid().required(),
});

const reportJobParamSchema = Joi.object({
  hackathonId: Joi.string().uuid().required(),
  jobId: Joi.string().uuid().required(),
});

const snapshotParamSchema = Joi.object({
  hackathonId: Joi.string().uuid().required(),
  snapshotId: Joi.string().uuid().required(),
});

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

const reportJobSchema = Joi.object({
  format: Joi.string().valid('PDF', 'CSV', 'JSON', 'XLSX', 'pdf', 'csv', 'json', 'xlsx').default('CSV'),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  fields: Joi.array().items(Joi.string().max(100)).max(50).default([]),
  parameters: Joi.object().unknown(true).default({}),
});

const snapshotSchema = Joi.object({
  snapshotType: Joi.string().valid('DAILY', 'ON_DEMAND').default('ON_DEMAND'),
  expiresAt: Joi.date().iso().allow(null),
});

router.get('/:hackathonId/report', validate(hackathonParamSchema, 'params'), authorizeEventStaff('CO_ORGANIZER', 'FINANCE', 'COMMUNICATIONS'), analyticsController.getReport);
router.get('/:hackathonId/export', validate(hackathonParamSchema, 'params'), authorizeEventStaff('CO_ORGANIZER', 'FINANCE', 'COMMUNICATIONS'), analyticsController.exportReport);

router.post('/:hackathonId/reports', validate(hackathonParamSchema, 'params'), authorizeEventStaff('CO_ORGANIZER', 'FINANCE', 'COMMUNICATIONS'), validate(reportJobSchema), analyticsController.createReportJob);
router.get('/:hackathonId/reports/:jobId/status', validate(reportJobParamSchema, 'params'), authorizeEventStaff('CO_ORGANIZER', 'FINANCE', 'COMMUNICATIONS'), analyticsController.getReportJobStatus);
router.get('/:hackathonId/reports/:jobId/download', validate(reportJobParamSchema, 'params'), authorizeEventStaff('CO_ORGANIZER', 'FINANCE', 'COMMUNICATIONS'), analyticsController.downloadReport);

router.get('/:hackathonId/snapshots', validate(hackathonParamSchema, 'params'), authorizeEventStaff('CO_ORGANIZER', 'FINANCE', 'COMMUNICATIONS'), analyticsController.listSnapshots);
router.get('/:hackathonId/snapshots/:snapshotId', validate(snapshotParamSchema, 'params'), authorizeEventStaff('CO_ORGANIZER', 'FINANCE', 'COMMUNICATIONS'), analyticsController.getSnapshot);
router.post('/:hackathonId/snapshots', validate(hackathonParamSchema, 'params'), authorizeEventStaff('CO_ORGANIZER', 'FINANCE', 'COMMUNICATIONS'), validate(snapshotSchema), analyticsController.createSnapshot);

module.exports = router;
