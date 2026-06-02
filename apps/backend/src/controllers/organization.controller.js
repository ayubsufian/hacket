// =============================================================================
// HackET — Organization Controller
// =============================================================================

const organizationService = require('../services/organization/organization.service');
const catchAsync = require('../utils/catchAsync');

exports.listPublic = catchAsync(async (req, res) => {
  const result = await organizationService.listPublic(req.query);

  res.status(200).json({
    success: true,
    data: { organizations: result.data },
    pagination: result.pagination,
  });
});

exports.getPublicById = catchAsync(async (req, res) => {
  const organization = await organizationService.getPublicById(req.params.id);

  res.status(200).json({
    success: true,
    data: { organization },
  });
});

exports.listHackathons = catchAsync(async (req, res) => {
  const result = await organizationService.listHackathons(req.params.id, req.query);

  res.status(200).json({
    success: true,
    data: { hackathons: result.data },
    pagination: result.pagination,
  });
});

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

exports.uploadLogo = catchAsync(async (req, res) => {
  const organization = await organizationService.uploadLogo(req.user.id, req.file, req);

  res.status(200).json({
    success: true,
    message: 'Organization logo uploaded successfully.',
    data: { organization, logoUrl: organization.logoUrl },
  });
});
