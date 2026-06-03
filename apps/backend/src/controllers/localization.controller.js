const localizationService = require('../services/localization/localization.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Public endpoint for the frontend
exports.getDictionary = catchAsync(async (req, res) => {
  const { locale } = req.params;
  if (!locale) {
    throw new AppError('Locale is required.', 400);
  }

  const dictionary = await localizationService.getDictionary(locale);

  // Return exactly the format requested by typical i18n libraries
  res.status(200).json(dictionary);
});

// Admin endpoints
exports.getAdminList = catchAsync(async (req, res) => {
  const result = await localizationService.getAdminList(req.query);

  res.status(200).json({
    success: true,
    data: { translations: result.data },
    pagination: result.pagination
  });
});

exports.upsertTranslation = catchAsync(async (req, res) => {
  const { key, locale, value, context } = req.body;

  const translation = await localizationService.upsertTranslation({
    key,
    locale,
    value,
    context,
    authorId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Translation updated successfully.',
    data: { translation }
  });
});

exports.deleteTranslation = catchAsync(async (req, res) => {
  const { id } = req.params;

  await localizationService.deleteTranslation(id);

  res.status(200).json({
    success: true,
    message: 'Translation deleted successfully.'
  });
});
