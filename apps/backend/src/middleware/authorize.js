// =============================================================================
// HackET — Role-Based Authorization Middleware
// Factory function that returns middleware restricting access to specified roles.
// Must be used AFTER the authenticate middleware.
// =============================================================================

const AppError = require('../utils/AppError');

/**
 * Authorization middleware factory.
 * @param  {...string} allowedRoles - Roles permitted to access the route
 *   e.g., authorize('ORGANIZER', 'ADMIN')
 * @returns {Function} Express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError('Authentication required before authorization.', 401)
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}.`,
          403
        )
      );
    }

    next();
  };
};

module.exports = authorize;
