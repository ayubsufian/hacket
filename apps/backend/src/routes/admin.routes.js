// =============================================================================
// HackET — Admin Routes
// =============================================================================

const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

// Lock all routes behind strictly defined administrative authorization
router.use(authenticate, authorize('ADMIN'));

// Main Flow & AF3: Monitoring Dashboard
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/audit-logs/export', adminController.exportAuditLogs);

// AF1: Provision Secondary Administrator
router.post('/provision', adminController.provisionAdmin);

// AF2: Account Suspension & Reactivation
router.patch('/users/:id/suspend', adminController.suspendUser);
router.patch('/users/:id/unsuspend', adminController.unsuspendUser);

// AF4: Organizer Approval
router.get('/organizer-verifications', adminController.listOrganizerVerifications);
router.get('/organizer-verifications/:id', adminController.getOrganizerVerification);
router.patch('/users/:id/approve', adminController.approveOrganizer);
router.patch('/users/:id/reject', adminController.rejectOrganizer);

// Main Flow & AF1: Archive Event Data
router.post('/events/:id/archive', adminController.archiveEvent);

module.exports = router;
