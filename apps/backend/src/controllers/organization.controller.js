// =============================================================================
// HackET — Organization Controller
// =============================================================================

const organizationService = require('../services/organization.service');
const catchAsync = require('../utils/catchAsync');

exports.getMe = catchAsync(async (req, res) => {
  const organization = await organizationService.getOrganizationProfile(req.user.id);

  res.status(200).json({
    success: true,
    data: { organization },
  });
});

exports.updateMe = catchAsync(async (req, res) => {
  const updatedOrganization = await organizationService.updateOrganizationProfile(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Organization profile updated successfully.',
    data: { organization: updatedOrganization },
  });
});
