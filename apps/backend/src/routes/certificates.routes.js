// =============================================================================
// HackET — Certificates Routes
// =============================================================================

const { Router } = require('express');
const certificatesController = require('../controllers/certificates.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.use(authenticate);

// Main Flow: Participant views their own certificates
router.get('/my-achievements', authorize('PARTICIPANT'), certificatesController.getMyCertificates);

// AF1: Participant reports a broken certificate link
router.post('/:id/report-broken-link', authorize('PARTICIPANT'), certificatesController.reportBrokenLink);

// AF2: Administrator bulk issues certificates
router.post('/bulk-issue', authorize('ORGANIZER', 'ADMIN'), certificatesController.bulkIssue);

module.exports = router;
