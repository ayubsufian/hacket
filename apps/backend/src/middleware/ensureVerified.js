// =============================================================================
// HackET — Verification Status Middleware
// Ensures the authenticated user is fully verified before allowing access.
// Must be used AFTER the authenticate middleware.
// =============================================================================

const AppError = require('../utils/AppError');
const prisma = require('../config/database');
const catchAsync = require('../utils/catchAsync');

/**
 * Middleware: Ensure user is completely verified by checking the live database status.
 */
const ensureVerified = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError('Authentication required before checking verification status.', 401)
    );
  }

  // 2026 UX Standard: Do a fast DB lookup here so Organizers don't have to 
  // log out and log back in to get a new JWT after Admin approval.
  const liveUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { verificationStatus: true }
  });

  if (!liveUser) {
    return next(new AppError('User account no longer exists.', 401));
  }

  if (liveUser.verificationStatus === 'UNVERIFIED') {
    return next(
      new AppError('You must verify your email address before performing this action.', 403)
    );
  }

  if (liveUser.verificationStatus === 'PENDING' || liveUser.verificationStatus === 'UNDER_REVIEW') {
    return next(
      new AppError('Your account is currently under administrative review. You cannot perform this action yet.', 403)
    );
  }

  if (liveUser.verificationStatus === 'REJECTED') {
    return next(
      new AppError('Your account registration has been rejected. Please contact support.', 403)
    );
  }

  // Update req.user with the live status just in case downstream controllers need it
  req.user.verificationStatus = liveUser.verificationStatus;

  next();
});

module.exports = ensureVerified;
