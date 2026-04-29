// =============================================================================
// HackET — Joi Validation Middleware Factory
// Validates request body (or query/params) against a Joi schema.
// =============================================================================

const AppError = require('../utils/AppError');

/**
 * Validation middleware factory.
 * @param {import('joi').ObjectSchema} schema - Joi schema to validate against
 * @param {'body'|'query'|'params'} source - Request property to validate (default: 'body')
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,     // Collect all errors, not just the first
      stripUnknown: true,    // Remove unknown keys
      allowUnknown: false,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      }));

      return next(
        Object.assign(
          new AppError('Validation failed.', 400),
          { details }
        )
      );
    }

    // Replace request data with validated/sanitized values
    req[source] = value;
    next();
  };
};

module.exports = validate;
