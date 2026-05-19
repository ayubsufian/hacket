// =============================================================================
// HackET — Profile Completion Middleware
// Ensures OAuth-created placeholder names are completed before protected actions.
// Must be used AFTER the authenticate middleware.
// =============================================================================

const AppError = require('../utils/AppError');
const prisma = require('../config/database');
const catchAsync = require('../utils/catchAsync');

const ensureProfileComplete = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError('Authentication required before checking profile completion.', 401)
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      profile: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!user) {
    return next(new AppError('User account no longer exists.', 401));
  }

  const firstName = user.profile?.firstName?.trim();
  const lastName = user.profile?.lastName?.trim();
  const isIncomplete = !firstName || !lastName || firstName === 'New' || lastName === 'User';

  if (isIncomplete) {
    return next(
      new AppError('Please complete your profile before performing this action.', 403)
    );
  }

  next();
});

module.exports = ensureProfileComplete;
