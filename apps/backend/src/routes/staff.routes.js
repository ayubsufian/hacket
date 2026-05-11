// =============================================================================
// HackET — Staff Management Routes
// =============================================================================

const { Router } = require('express');
const staffController = require('../controllers/staff.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Note: mergeParams required to access :eventId from parent router
const router = Router({ mergeParams: true });

// Lock all routes
router.use(authenticate, authorize('ORGANIZER', 'ADMIN'));

// Main Flow: Onboarding
router.post('/invitations', staffController.inviteStaff);

// AF1 & AF2: Modify/Revoke Access
router.patch('/assignments/:id', staffController.updateStaff);

module.exports = router;
