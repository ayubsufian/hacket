// =============================================================================
// HackET — Certificates Routes
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const certificatesController = require('../controllers/certificates.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const authorizeEventStaff = require('../middleware/authorizeEventStaff');
const validate = require('../middleware/validate');

const router = Router();

router.use(authenticate);

const bulkIssueSchema = Joi.object({
  hackathonId: Joi.string().uuid().required(),
  userIds: Joi.array().items(Joi.string().uuid()).min(1).max(500).required(),
  title: Joi.string().trim().min(2).max(255).required(),
  type: Joi.string().valid('CERTIFICATE', 'BADGE').default('CERTIFICATE'),
  awardTier: Joi.string().trim().max(50).default('participation'),
  metadata: Joi.object().unknown(true).default({}),
});

const revokeSchema = Joi.object({
  reason: Joi.string().trim().max(1000).allow(null, ''),
});

// Main Flow: Participant views their own certificates
router.get('/my-achievements', authorize('PARTICIPANT'), certificatesController.getMyCertificates);

router.get('/hackathons/:hackathonId/certificates', authorizeEventStaff('CO_ORGANIZER', 'FINANCE'), certificatesController.listHackathonCertificates);

router.get('/:id', certificatesController.getById);
router.get('/:id/download', certificatesController.download);

// AF1: Participant reports a broken certificate link
router.post('/:id/report-broken-link', authorize('PARTICIPANT'), certificatesController.reportBrokenLink);

// AF2: Administrator bulk issues certificates
router.post('/bulk-issue', authorize('ORGANIZER', 'ADMIN'), validate(bulkIssueSchema), certificatesController.bulkIssue);
router.patch('/:id/revoke', authorize('ADMIN'), validate(revokeSchema), certificatesController.revoke);
router.post('/:id/regenerate', authorize('ORGANIZER', 'ADMIN'), certificatesController.regenerate);

module.exports = router;
