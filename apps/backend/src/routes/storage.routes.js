const { Router } = require('express');
const storageController = require('../controllers/storage.controller');
const authenticate = require('../middleware/auth');

const router = Router();

// ── Authenticated Only ──────────────────────────────────────────────────
// Technical Docs: /api/v1/storage/submissions/:entityId/spec.pdf
router.get(
  '/submissions/:entityId/spec.pdf',
  authenticate,
  (req, res, next) => {
    req.params.folder = 'submissions';
    req.params.filename = 'spec.pdf';
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
