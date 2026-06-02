// =============================================================================
// HackET — Admin Routes
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const adminController = require('../controllers/admin.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { adminLimiter, adminMutationLimiter } = require('../middleware/rateLimiter');

const router = Router();

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const provisionAdminSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName: Joi.string().trim().min(1).max(100).required(),
});

const suspendSchema = Joi.object({
  reason: Joi.string().trim().max(1000).allow(null, ''),
});

const roleSchema = Joi.object({
  role: Joi.string().valid('PARTICIPANT', 'ORGANIZER', 'JUDGE', 'MENTOR', 'ADMIN').required(),
  reason: Joi.string().trim().max(1000).allow(null, ''),
});

const hackathonStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      'DRAFT',
      'UPCOMING',
      'REGISTRATION_OPEN',
      'REGISTRATION_CLOSED',
      'IN_PROGRESS',
      'JUDGING',
      'COMPLETED',
      'CANCELLED',
      'SUSPENDED',
      'ARCHIVED'
    )
    .required(),
  reason: Joi.string().trim().max(1000).allow(null, ''),
});

const cancelJobSchema = Joi.object({
  reason: Joi.string().trim().max(1000).allow(null, ''),
  type: Joi.string().valid('report', 'archive', 'analytics', 'certificate').optional(),
});

// Lock all routes behind strictly defined administrative authorization
router.use(authenticate, authorize('ADMIN'));
router.use(adminLimiter);

// Main Flow & AF3: Monitoring Dashboard
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/audit-logs/export', adminController.exportAuditLogs);

// AF1: Provision Secondary Administrator
router.post('/provision', adminMutationLimiter, validate(provisionAdminSchema), adminController.provisionAdmin);

// AF2: Account Suspension & Reactivation
router.get('/users', adminController.listUsers);
router.get('/users/:id', validate(uuidParamSchema, 'params'), adminController.getUserDetail);
router.patch('/users/:id/role', adminMutationLimiter, validate(uuidParamSchema, 'params'), validate(roleSchema), adminController.changeUserRole);
router.patch('/users/:id/suspend', adminMutationLimiter, validate(uuidParamSchema, 'params'), validate(suspendSchema), adminController.suspendUser);
router.patch('/users/:id/unsuspend', adminMutationLimiter, validate(uuidParamSchema, 'params'), adminController.unsuspendUser);

// AF4: Organizer Approval
router.get('/organizer-verifications', adminController.listOrganizerVerifications);
router.get('/organizer-verifications/:id', validate(uuidParamSchema, 'params'), adminController.getOrganizerVerification);
router.patch('/users/:id/approve', adminMutationLimiter, validate(uuidParamSchema, 'params'), adminController.approveOrganizer);
router.patch('/users/:id/reject', adminMutationLimiter, validate(uuidParamSchema, 'params'), adminController.rejectOrganizer);

router.get('/hackathons', adminController.listHackathons);
router.patch(
  '/hackathons/:id/status',
  adminMutationLimiter,
  validate(uuidParamSchema, 'params'),
  validate(hackathonStatusSchema),
  adminController.changeHackathonStatus
);

router.get('/jobs', adminController.listJobs);
router.post('/jobs/:id/cancel', adminMutationLimiter, validate(uuidParamSchema, 'params'), validate(cancelJobSchema), adminController.cancelJob);
router.get('/system/health', adminController.getSystemHealth);
router.post('/search/reindex', adminMutationLimiter, adminController.reindexSearch);

// Main Flow & AF1: Archive Event Data
router.post('/events/:id/archive', adminMutationLimiter, validate(uuidParamSchema, 'params'), adminController.archiveEvent);

module.exports = router;
