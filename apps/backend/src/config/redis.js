// =============================================================================
// HackET — Redis Client Configuration
// Uses redis v4 with graceful reconnection strategy.
// Provides session management helpers with 30-minute sliding TTL.
// =============================================================================

const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SESSION_TTL_SECONDS = 30 * 60; // 30-minute inactivity timeout
const ALLOW_REDIS_FALLBACK =
  process.env.ALLOW_REDIS_FALLBACK === 'true' ||
  (!process.env.ALLOW_REDIS_FALLBACK && process.env.NODE_ENV !== 'production');

let redisAvailable = false;
const memorySessions = new Map();

const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('[Redis] Max reconnection attempts reached. Giving up.');
        return new Error('Max reconnection attempts reached');
      }
      const delay = Math.min(retries * 200, 5000);
      console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${retries})...`);
      return delay;
    },
  },
});

redisClient.on('connect', () => console.log('[Redis] Connected'));
redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));
redisClient.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

/**
 * Connect to Redis. Call once at server startup.
 */
async function connectRedis() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      redisAvailable = true;
    } catch (err) {
      redisAvailable = false;
      if (!ALLOW_REDIS_FALLBACK) {
        throw err;
      }
      console.warn('[Redis] Unavailable. Falling back to in-memory sessions for local development.');
    }
  }
}

/**
 * Gracefully disconnect from Redis. Call at shutdown.
 */
async function disconnectRedis() {
  if (redisClient.isOpen && redisAvailable) {
    await redisClient.quit();
  }
  memorySessions.clear();
}

// ---------------------------------------------------------------------------
// Session helpers (30-min sliding window)
// ---------------------------------------------------------------------------

/**
 * Create or refresh a user session in Redis.
 * @param {string} userId
 * @param {object} sessionData - Arbitrary session payload (role, etc.)
 */
async function setSession(userId, sessionData) {
  const key = `session:${userId}`;
  if (redisAvailable) {
    await redisClient.set(key, JSON.stringify(sessionData), { EX: SESSION_TTL_SECONDS });
    return;
  }

  memorySessions.set(key, {
    payload: sessionData,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
}

/**
 * Retrieve and refresh a session (sliding window).
 * Returns null if session expired or doesn't exist.
 * @param {string} userId
 * @returns {object|null}
 */
async function getSession(userId) {
  const key = `session:${userId}`;
  if (redisAvailable) {
    const data = await redisClient.get(key);
    if (!data) return null;

    await redisClient.expire(key, SESSION_TTL_SECONDS);
    return JSON.parse(data);
  }

  const data = memorySessions.get(key);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    memorySessions.delete(key);
    return null;
  }

  data.expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  return data.payload;
}

/**
 * Destroy a user session.
 * @param {string} userId
 */
async function destroySession(userId) {
  const key = `session:${userId}`;
  if (redisAvailable) {
    await redisClient.del(key);
    return;
  }
  memorySessions.delete(key);
}

module.exports = {
  redisClient,
  connectRedis,
  disconnectRedis,
  setSession,
  getSession,
  destroySession,
  SESSION_TTL_SECONDS,
};
