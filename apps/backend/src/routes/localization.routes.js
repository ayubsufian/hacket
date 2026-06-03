const { Router } = require('express');
const localizationController = require('../controllers/localization.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

// Public route for the frontend to fetch the dictionary for a specific locale
router.get('/dictionary/:locale', localizationController.getDictionary);

// Admin routes for managing translations
router.get(
  '/admin',
  authenticate,
  authorize('ADMIN'),
  localizationController.getAdminList
);

router.post(
  '/admin/upsert',
  authenticate,
  authorize('ADMIN'),
  localizationController.upsertTranslation
);

router.delete(
  '/admin/:id',
  authenticate,
  authorize('ADMIN'),
  localizationController.deleteTranslation
);

module.exports = router;
