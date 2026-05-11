// =============================================================================
// HackET — Search Controller
// Federated search against active Postgres records and Archived JSON files.
// =============================================================================

const fs = require('fs/promises');
const path = require('path');
const prisma = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { performance } = require('perf_hooks');

const ARCHIVE_DIR = path.join(__dirname, '../../../../uploads/archives');

/**
 * Perform a concurrent federated search.
 */
exports.searchMetadata = catchAsync(async (req, res) => {
  const query = req.query.q || '';
  if (!query) {
    throw new AppError('Search query (q) is required.', 400);
  }

  // 1. Search Active Postgres Records
  const activeSearchPromise = prisma.hackathon.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
      status: { not: 'ARCHIVED' },
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
    },
    take: 20,
  });

  // 2. Search Archived JSON Files (with Delay Detection)
  const archiveSearchPromise = async () => {
    const startTime = performance.now();
    let results = [];
    
    try {
      const files = await fs.readdir(ARCHIVE_DIR);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(ARCHIVE_DIR, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        
        // Regex case-insensitive match
        const regex = new RegExp(query, 'i');
        if (regex.test(parsed.title) || regex.test(parsed.description)) {
          results.push({
            id: parsed.id,
            title: parsed.title,
            description: parsed.description,
            status: parsed.status,
            source: 'archive'
          });
        }
      }
    } catch (err) {
      // If directory doesn't exist yet, simply return empty archive results
      if (err.code !== 'ENOENT') {
        console.error('[Search] Failed to read archives:', err.message);
      }
    }
    
    const endTime = performance.now();
    return {
      results,
      durationMs: endTime - startTime
    };
  };

  // Run searches concurrently
  const [activeResults, archiveData] = await Promise.all([
    activeSearchPromise,
    archiveSearchPromise()
  ]);

  const combinedResults = [...activeResults, ...archiveData.results];
  let warning = undefined;
  let message = undefined;

  // AF1: Search No Results
  if (combinedResults.length === 0) {
    message = 'No matching results found.';
  }

  // AF2: Archived Data Retrieval Delay
  if (archiveData.durationMs > 500) {
    warning = 'Retrieving archived results, may take a few moments.';
  }

  res.status(200).json({
    success: true,
    ...(message && { message }),
    ...(warning && { warning }),
    data: { results: combinedResults }
  });
});
