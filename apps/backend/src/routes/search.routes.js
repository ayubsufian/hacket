// =============================================================================
// HackET — Search Routes
// =============================================================================

const { Router } = require('express');
const Joi = require('joi');
const searchController = require('../controllers/search.controller');
const softAuth = require('../middleware/softAuth');
const validate = require('../middleware/validate');
const { searchLogLimiter } = require('../middleware/rateLimiter');

const router = Router();

const logSchema = Joi.object({
  query: Joi.string().trim().min(1).max(500).required(),
  resultCount: Joi.number().integer().min(0).default(0),
  source: Joi.string().valid('CURRENT', 'ARCHIVE', 'current', 'archive').allow(null),
  durationMs: Joi.number().integer().min(0).allow(null),
});

// Publicly accessible search endpoint
router.use(softAuth);
router.get('/suggestions', searchController.suggestions);
router.post('/log', searchLogLimiter, validate(logSchema), searchController.logQuery);
router.get('/', searchLogLimiter, searchController.searchMetadata);

module.exports = router;
