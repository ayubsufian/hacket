// =============================================================================
// HackET — Async Handler Wrapper
// Eliminates repetitive try-catch blocks in Express route handlers.
// =============================================================================

/**
 * Wraps an async Express handler to forward thrown errors to next().
 * @param {Function} fn - Async route handler (req, res, next) => Promise
 * @returns {Function} Express middleware
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
