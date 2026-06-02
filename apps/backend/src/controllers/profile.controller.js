// =============================================================================
// HackET — Profile Controller
// =============================================================================

const profileService = require('../services/profile/profile.service');
const teamsService = require('../services/teams/teams.service');
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

exports.uploadAvatar = catchAsync(async (req, res) => {
  const profile = await profileService.uploadAvatar(req.user.id, req.file, req);

  res.status(200).json({
    success: true,
    message: 'Avatar uploaded successfully.',
    data: { avatarUrl: profile.avatarUrl, profile },
  });
});

exports.getMyTeams = catchAsync(async (req, res) => {
  const result = await teamsService.getMine(req.user.id, req.query);

  res.status(200).json({
    success: true,
    data: { teams: result.data },
    pagination: result.pagination,
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

exports.getPublicProfile = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const userProfile = await profileService.getPublicProfile(userId);

  res.status(200).json({
    success: true,
    data: { user: userProfile },
  });
});
