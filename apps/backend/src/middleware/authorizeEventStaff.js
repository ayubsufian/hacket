// =============================================================================
// HackET — Event-Level Authorization Middleware
// Verifies if the authenticated user has a specific StaffRole for the target event.
// =============================================================================

const prisma = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Event-level RBAC Middleware.
 * Checks if the user is the Primary Organizer, a Global Admin, or holds one
 * of the allowed StaffRoles for the specific hackathon.
 *
 * @param {...string} allowedRoles - List of allowed StaffRole strings (e.g., 'CO_ORGANIZER', 'JUDGE')
 */
const authorizeEventStaff = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const eventId = req.params.eventId || req.params.id; // Support both route parameter names

      if (!eventId) {
        return next(new AppError('Event ID is required for authorization.', 400));
      }

      // 1. Global Admin Override
      if (req.user.role === 'ADMIN') {
        return next();
      }

      // Fetch the hackathon
      const hackathon = await prisma.hackathon.findUnique({
        where: { id: eventId },
        select: { organizerId: true }
      });

      if (!hackathon) {
        return next(new AppError('Hackathon not found.', 404));
      }

      // 2. Primary Organizer Override
      // The person who created the Hackathon inherently has full access to everything.
      if (hackathon.organizerId === req.user.id) {
        return next();
      }

      // 3. Granular StaffRole Verification
      // Check if the user has an active StaffAssignment with one of the allowed roles
      const staffAssignment = await prisma.staffAssignment.findFirst({
        where: {
          userId: req.user.id,
          hackathonId: eventId,
          isActive: true,
          staffRole: { in: allowedRoles }
        }
      });

      if (!staffAssignment) {
        return next(new AppError(`Forbidden. You must be one of the following to perform this action: ${allowedRoles.join(', ')}`, 403));
      }

      // Bind the validated role to the request for downstream controllers
      req.eventStaffRole = staffAssignment.staffRole;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = authorizeEventStaff;
