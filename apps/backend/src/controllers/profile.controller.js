// =============================================================================
// HackET — Profile Controller
// =============================================================================

const profileService = require('../services/profile/profile.service');
const catchAsync = require('../utils/catchAsync');

exports.getMe = catchAsync(async (req, res) => {
  const result = await profileService.getProfileWithHistory(req.user.id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

exports.updateProfile = catchAsync(async (req, res) => {
  const updatedProfile = await profileService.updateProfile(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: { profile: updatedProfile },
  });
});

exports.getParticipationDetails = catchAsync(async (req, res) => {
  const { hackathonId } = req.params;
  const details = await profileService.getParticipationDetails(req.user.id, hackathonId);

  res.status(200).json({
    success: true,
    data: { participation: details },
  });
});
