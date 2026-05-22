// =============================================================================
// HackET — Staff Management Routes
// =============================================================================

const { Router } = require('express');
const staffController = require('../controllers/staff.controller');
const authenticate = require('../middleware/auth');
const ensureVerified = require('../middleware/ensureVerified');
const ensureProfileComplete = require('../middleware/ensureProfileComplete');

// Note: mergeParams required to access :eventId from parent router
const router = Router({ mergeParams: true });

// Participant needs to be able to accept an invitation (no event authorization needed yet, handled in controller)
router.post(
  '/invitations/accept',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  staffController.acceptInvitation
);

// Main Flow: Onboarding (Requires eventId in URL from parent router)
const authorizeEventStaff = require('../middleware/authorizeEventStaff');
router.post(
  '/invitations',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('CO_ORGANIZER'),
  staffController.inviteStaff
);

// AF1 & AF2: Modify/Revoke Access
// Authorization for this is handled directly in the controller since eventId is not in the URL
router.patch(
  '/assignments/:id',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  staffController.updateStaff
);

module.exports = router;
