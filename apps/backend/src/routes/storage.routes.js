const { Router } = require('express');
const multer = require('multer');
const storageController = require('../controllers/storage.controller');
const authenticate = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { tmpUploadsRoot } = require('../utils/paths');

const router = Router();
const upload = multer({
  dest: tmpUploadsRoot,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ── Authenticated Only ──────────────────────────────────────────────────
// Submission artifacts require event-scoped authorization.
router.post(
  '/upload/:folder',
  authenticate,
  uploadLimiter,
  upload.single('file'),
  storageController.upload
);

router.delete(
  '/:folder/:entityId/:filename',
  authenticate,
  storageController.deleteBlob
);

router.get(
  '/:folder/:entityId/:filename/signed-url',
  authenticate,
  storageController.createSignedUrl
);

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
