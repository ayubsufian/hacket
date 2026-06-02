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
  const report = await withTimeout(analyticsService.getReport(req.params.hackathonId, req.query));

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
  const format = (req.query.format || '').toLowerCase();
  const { hackathonId } = req.params;

  try {
    if (await analyticsService.shouldUseAsyncExport(hackathonId)) {
      const job = await analyticsService.createReportJob({
        hackathonId,
        createdBy: req.user.id,
        format: (format || 'csv').toUpperCase(),
        parameters: req.query,
      });

      return res.status(202).json({
        success: true,
        message: 'Large report export queued. Poll the report job status endpoint for progress.',
        data: { job },
      });
    }

    res.set('Deprecation', 'true');
    res.set('Sunset', '2026-12-31');
    res.set('Link', `</api/v1/analytics/${hackathonId}/reports>; rel="successor-version"`);

    if (format === 'pdf') {
      const pdfBuffer = await withTimeout(analyticsService.generatePDF(hackathonId, req.query));
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="hacket-report-${hackathonId}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      return res.send(pdfBuffer);
    }

    if (format === 'csv') {
      const csvString = await withTimeout(analyticsService.generateCSV(hackathonId, req.query));
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
  const report = await withTimeout(analyticsService.getReport(hackathonId, req.query));
  
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

exports.createReportJob = catchAsync(async (req, res) => {
  const { hackathonId } = req.params;
  const parameters = {
    ...req.body.parameters,
    from: req.body.from,
    to: req.body.to,
    fields: req.body.fields,
  };

  const job = await analyticsService.createReportJob({
    hackathonId,
    createdBy: req.user.id,
    format: req.body.format.toUpperCase(),
    parameters,
  });

  res.status(202).json({
    success: true,
    message: 'Report generation queued.',
    data: { job },
  });
});

exports.getReportJobStatus = catchAsync(async (req, res) => {
  const job = await analyticsService.getReportJobStatus(
    req.params.hackathonId,
    req.params.jobId
  );

  res.status(200).json({
    success: true,
    data: { job },
  });
});

exports.downloadReport = catchAsync(async (req, res) => {
  const file = await analyticsService.getReportDownload({
    hackathonId: req.params.hackathonId,
    jobId: req.params.jobId,
    token: req.query.token,
  });

  res.set({
    'Content-Type': file.mimeType,
    'Content-Disposition': `attachment; filename="${file.filename}"`,
  });
  res.sendFile(file.absolutePath);
});

exports.listSnapshots = catchAsync(async (req, res) => {
  const result = await analyticsService.listSnapshots(req.params.hackathonId, req.query);

  res.status(200).json({
    success: true,
    data: { snapshots: result.data },
    pagination: result.pagination,
  });
});

exports.getSnapshot = catchAsync(async (req, res) => {
  const snapshot = await analyticsService.getSnapshot(
    req.params.hackathonId,
    req.params.snapshotId
  );

  res.status(200).json({
    success: true,
    data: { snapshot },
  });
});

exports.createSnapshot = catchAsync(async (req, res) => {
  const snapshot = await analyticsService.createSnapshot({
    hackathonId: req.params.hackathonId,
    computedBy: req.user.id,
    snapshotType: req.body.snapshotType,
    expiresAt: req.body.expiresAt,
  });

  res.status(202).json({
    success: true,
    message: 'Analytics snapshot computed.',
    data: { snapshot },
  });
});
