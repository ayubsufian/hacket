// =============================================================================
// HackET — Bookmark Routes
// GET    /api/v1/bookmarks
// POST   /api/v1/bookmarks/organizations/:organizationId
// DELETE /api/v1/bookmarks/organizations/:organizationId
// =============================================================================

const { Router } = require('express');
const bookmarkController = require('../controllers/bookmark.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const Joi = require('joi');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const organizationParamSchema = Joi.object({
  organizationId: Joi.string().uuid().required(),
});

const bulkOrganizationSchema = Joi.object({
  organizationIds: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
});

// ── Routes ──────────────────────────────────────────────────────────────

router.use(authenticate); // Protect all bookmark routes

router.get('/', bookmarkController.getMyBookmarks);

router.get(
  '/organizations/:organizationId/check',
  validate(organizationParamSchema, 'params'),
  bookmarkController.checkBookmark
);

router.post(
  '/organizations/bulk',
  validate(bulkOrganizationSchema),
  bookmarkController.bulkAddBookmarks
);

router.post(
  '/organizations/:organizationId',
  validate(organizationParamSchema, 'params'),
  bookmarkController.addBookmark
);

router.delete(
  '/organizations/:organizationId',
  validate(organizationParamSchema, 'params'),
  bookmarkController.removeBookmark
);

module.exports = router;
