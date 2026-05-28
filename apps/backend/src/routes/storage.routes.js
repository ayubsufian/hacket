const { Router } = require('express');
const storageController = require('../controllers/storage.controller');
const authenticate = require('../middleware/auth');

const router = Router();

// ── Authenticated Only ──────────────────────────────────────────────────
// Submission artifacts require event-scoped authorization.
router.get(
  '/submissions/:entityId/:filename',
  authenticate,
  (req, res, next) => {
    req.params.folder = 'submissions';
    next();
  },
  storageController.getAuthenticatedBlob
);

// ── Public Read ─────────────────────────────────────────────────────────
// Demo Videos: /api/v1/storage/submissions/:entityId/video.mp4
// User Avatars: /api/v1/storage/profiles/:entityId/avatar.png
// Event Media: /api/v1/storage/events/:entityId/banner.jpg
// Certificates: /api/v1/storage/awards/:entityId/:filename (e.g. hackathonId.pdf)

router.get('/:folder/:entityId/:filename', storageController.getPublicBlob);

module.exports = router;
