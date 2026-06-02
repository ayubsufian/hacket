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
const { redisClient } = require('../config/redis');
const { archiveUploadsRoot } = require('../utils/paths');

const ARCHIVE_DIR = archiveUploadsRoot;

/**
 * Perform a concurrent federated search.
 */
exports.searchMetadata = catchAsync(async (req, res) => {
  const query = req.query.q || '';
  if (!query) {
    throw new AppError('Search query (q) is required.', 400);
  }
  const start = performance.now();
  const source = normalizeSource(req.query.source);
  const entity = req.query.entity ? String(req.query.entity).toLowerCase() : null;
  const cacheKey = `search:v2:${JSON.stringify({ query, source, entity })}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }
  } catch (err) {
    console.warn('[Search] Redis cache get error:', err.message);
  }

  const activeSearchPromise = source === 'ARCHIVE'
    ? Promise.resolve([])
    : searchCurrentDocuments(query, entity);

  // 2. Search Archived JSON Files (with Delay Detection)
  const archiveSearchPromise = async () => {
    if (source === 'CURRENT') return { results: [], durationMs: 0 };
    const startTime = performance.now();
    let results = [];
    
    try {
      const files = await fs.readdir(ARCHIVE_DIR);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(ARCHIVE_DIR, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        
        // Safe case-insensitive match (no RegExp to prevent ReDoS)
        const lowerQuery = query.toLowerCase();
        const titleMatch = (parsed.title || '').toLowerCase().includes(lowerQuery);
        const descMatch = (parsed.description || '').toLowerCase().includes(lowerQuery);
        if (titleMatch || descMatch) {
          if (!entity || entity === 'hackathon') results.push({
            id: parsed.id,
            title: parsed.title,
            description: parsed.description,
            status: parsed.status,
            entity: 'hackathon',
            source: 'ARCHIVE'
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

  const combinedResults = [...activeResults, ...archiveData.results].slice(0, 50);
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

  const durationMs = Math.round(performance.now() - start);
  await persistSearchLog(req, {
    query,
    source,
    resultCount: combinedResults.length,
    durationMs,
  });

  const payload = {
    success: true,
    ...(message && { message }),
    ...(warning && { warning }),
    metadata: { durationMs, source: source || 'ALL', entity: entity || 'all' },
    data: { results: combinedResults }
  };

  try {
    await redisClient.setEx(cacheKey, combinedResults.length > 0 ? 60 : 15, JSON.stringify(payload));
  } catch (err) {
    console.warn('[Search] Redis cache set error:', err.message);
  }

  res.status(200).json(payload);
});

exports.suggestions = catchAsync(async (req, res) => {
  const query = req.query.q || '';
  if (!query) throw new AppError('Search query (q) is required.', 400);

  const hackathons = await prisma.hackathon.findMany({
    where: {
      title: { contains: query, mode: 'insensitive' },
      status: { notIn: ['ARCHIVED', 'CANCELLED', 'SUSPENDED'] },
    },
    select: { id: true, slug: true, title: true },
    orderBy: { title: 'asc' },
    take: 10,
  });

  res.status(200).json({
    success: true,
    data: {
      suggestions: hackathons.map((hackathon) => ({
        id: hackathon.id,
        title: hackathon.title,
        url: `/hackathons/${hackathon.slug || hackathon.id}`,
      })),
    },
  });
});

exports.logQuery = catchAsync(async (req, res) => {
  await persistSearchLog(req, {
    query: req.body.query,
    resultCount: req.body.resultCount,
    source: normalizeSource(req.body.source),
    durationMs: req.body.durationMs,
  });

  res.status(202).json({
    success: true,
    message: 'Search query logged.',
  });
});

function normalizeSource(value) {
  if (!value) return null;
  const normalized = String(value).toUpperCase();
  if (!['CURRENT', 'ARCHIVE'].includes(normalized)) {
    throw new AppError('Invalid search source filter.', 400);
  }
  return normalized;
}

async function searchCurrentDocuments(query, entity) {
  const where = {
    source: 'CURRENT',
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { searchText: { contains: query, mode: 'insensitive' } },
    ],
  };
  if (entity) where.entity = entity;

  const documents = await prisma.searchDocument.findMany({
    where,
    orderBy: { indexedAt: 'desc' },
    take: 50,
  });

  if (documents.length > 0) {
    return documents.map((document) => ({
      id: document.entityId,
      documentId: document.id,
      title: document.title,
      description: document.metadata?.description || null,
      status: document.metadata?.status || null,
      entity: document.entity,
      source: document.source,
      url: document.url,
      metadata: document.metadata,
    }));
  }

  if (entity && entity !== 'hackathon') return [];

  const hackathons = await prisma.hackathon.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
      status: { not: 'ARCHIVED' },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
    },
    take: 20,
  });

  return hackathons.map((hackathon) => ({
    ...hackathon,
    entity: 'hackathon',
    source: 'CURRENT',
    url: `/hackathons/${hackathon.slug || hackathon.id}`,
  }));
}

async function persistSearchLog(req, { query, source, resultCount, durationMs }) {
  await prisma.searchLog.create({
    data: {
      query,
      actorId: req.user?.id || null,
      source,
      resultCount,
      durationMs,
      ipAddress: req.ip,
    },
  });
}
