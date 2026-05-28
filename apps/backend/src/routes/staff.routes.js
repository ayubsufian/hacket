// =============================================================================
// HackET — Staff Management Routes
// =============================================================================

const { Router } = require('express');
const staffController = require('../controllers/staff.controller');
const staffConfigController = require('../controllers/staffConfig.controller');
const authenticate = require('../middleware/auth');
const softAuthenticate = require('../middleware/softAuth');
const ensureVerified = require('../middleware/ensureVerified');
const ensureProfileComplete = require('../middleware/ensureProfileComplete');
const authorizeEventStaff = require('../middleware/authorizeEventStaff');
const rateLimit = require('express-rate-limit');

// ─── Event-Scoped Router (/api/v1/events/:eventId/staff) ───────────────────
const eventRouter = Router({ mergeParams: true });

// Rate Limiter for Invitations
const invitationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many staff invitations created from this IP, please try again after an hour.'
});

eventRouter.get(
  '/',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  staffController.getStaffRoster
);

eventRouter.get(
  '/invitations',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  staffController.getInvitations
);

eventRouter.post(
  '/invitations',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('CO_ORGANIZER'),
  invitationLimiter,
  staffController.inviteStaff
);

eventRouter.post(
  '/invitations/:invitationId/resend',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  staffController.resendInvitation
);

eventRouter.delete(
  '/invitations/:invitationId',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  staffController.cancelInvitation
);

eventRouter.post(
  '/leave',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  staffController.leaveStaff
);

eventRouter.patch(
  '/assignments/:id',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  staffController.updateStaff
);

// Config Management Routes
eventRouter.get(
  '/configs',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('CO_ORGANIZER'),
  staffConfigController.getStaffConfigs
);

eventRouter.put(
  '/configs/:staffRole',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  authorizeEventStaff('CO_ORGANIZER'),
  staffConfigController.updateStaffConfig
);

// Greedy parameterized routes last
eventRouter.get(
  '/:id',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  staffController.getStaffDetail
);

// ─── Global Staff Router (/api/v1/staff) ───────────────────────────────────
const globalRouter = Router();

globalRouter.post(
  '/invitations/accept',
  softAuthenticate,
  staffController.acceptInvitationGlobal
);

globalRouter.get(
  '/me/assignments',
  authenticate,
  ensureVerified,
  ensureProfileComplete,
  staffController.getMyAssignments
);

module.exports = {
  eventRouter,
  globalRouter
};
