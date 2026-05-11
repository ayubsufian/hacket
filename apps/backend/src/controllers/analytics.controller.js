// =============================================================================
// HackET — Analytics Controller
// =============================================================================

const analyticsService = require('../services/analytics/analytics.service');
const eventBus = require('../utils/eventBus');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// AF1 Timeout Wrapper
const withTimeout = (promise, ms = 5000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new AppError('Report generation timed out. Try again later or use the simpler report generation.', 504));
    }, ms);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
};

exports.logTranslationError = catchAsync(async (req, res) => {
  const { key, language, url } = req.body;

  eventBus.emit('audit:log', {
    actorId: req.user?.id || 'SYSTEM_GUEST',
    action: 'TRANSLATION_MISSING',
    entity: 'system',
    entityId: key,
    details: { language, url, message: `Missing translation for key: ${key}` }
  });

  res.status(200).json({
    success: true,
    message: 'Translation error logged successfully.',
  });
});

exports.getReport = catchAsync(async (req, res) => {
  const report = await withTimeout(analyticsService.getReport(req.params.hackathonId));

  // AF2: Check for missing or incomplete data
  let metadata = undefined;
  if (report.summary.totalTeams === 0 || report.summary.totalParticipants === 0) {
    metadata = { prompt: 'Report generated but data is incomplete or empty based on current criteria.' };
  }

  res.status(200).json({
    success: true,
    ...(metadata && { metadata }),
    data: { report },
  });
});

exports.exportReport = catchAsync(async (req, res) => {
  const { format } = req.query;
  const { hackathonId } = req.params;

  try {
    if (format === 'pdf') {
      const pdfBuffer = await withTimeout(analyticsService.generatePDF(hackathonId));
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="hacket-report-${hackathonId}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      return res.send(pdfBuffer);
    }

    if (format === 'csv') {
      const csvString = await withTimeout(analyticsService.generateCSV(hackathonId));
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="hacket-report-${hackathonId}.csv"`,
      });
      return res.send(csvString);
    }
  } catch (err) {
    // Re-throw AF1 timeout errors unchanged
    if (err.statusCode === 504) throw err;

    // AF3: Export File Format Failure
    eventBus.emit('audit:log', {
      actorId: req.user?.id || 'SYSTEM',
      action: 'EXPORT_FORMAT_FAILURE',
      entity: 'report',
      entityId: hackathonId,
      details: { format, error: err.message }
    });

    throw new AppError('File export failed. Please try a different format.', 500);
  }

  // Default: JSON
  const report = await withTimeout(analyticsService.getReport(hackathonId));
  
  // AF2 logic applies to JSON export as well
  let metadata = undefined;
  if (report.summary.totalTeams === 0 || report.summary.totalParticipants === 0) {
    metadata = { prompt: 'Report generated but data is incomplete or empty based on current criteria.' };
  }

  res.status(200).json({
    success: true,
    ...(metadata && { metadata }),
    data: { report },
  });
});
