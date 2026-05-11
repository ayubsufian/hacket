// =============================================================================
// HackET — Search Routes
// =============================================================================

const { Router } = require('express');
const searchController = require('../controllers/search.controller');

const router = Router();

// Publicly accessible search endpoint
router.get('/', searchController.searchMetadata);

module.exports = router;
