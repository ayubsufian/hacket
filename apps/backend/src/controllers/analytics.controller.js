// =============================================================================
// HackET — Analytics Controller
// =============================================================================

const analyticsService = require('../services/analytics/analytics.service');
const catchAsync = require('../utils/catchAsync');

exports.getReport = catchAsync(async (req, res) => {
  const report = await analyticsService.getReport(req.params.hackathonId);

  res.status(200).json({
    success: true,
    data: { report },
  });
});

exports.exportReport = catchAsync(async (req, res) => {
  const { format } = req.query;
  const { hackathonId } = req.params;

  if (format === 'pdf') {
    const pdfBuffer = await analyticsService.generatePDF(hackathonId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="hacket-report-${hackathonId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.send(pdfBuffer);
  }

  if (format === 'csv') {
    const csvString = await analyticsService.generateCSV(hackathonId);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="hacket-report-${hackathonId}.csv"`,
    });
    return res.send(csvString);
  }

  // Default: JSON
  const report = await analyticsService.getReport(hackathonId);
  res.status(200).json({
    success: true,
    data: { report },
  });
});
