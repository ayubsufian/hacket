// =============================================================================
// HackET — Redis Client Configuration
// Uses redis v4 with graceful reconnection strategy.
// Provides session management helpers with 30-minute sliding TTL.
// =============================================================================

const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SESSION_TTL_SECONDS = 30 * 60; // 30-minute inactivity timeout
const PARTICIPANT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days for Participant role

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
    await redisClient.connect();
  }
}

/**
 * Gracefully disconnect from Redis. Call at shutdown.
 */
async function disconnectRedis() {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
}

// ---------------------------------------------------------------------------
// Session helpers (30-min sliding window)
// ---------------------------------------------------------------------------

/**
 * Create or refresh a user session in Redis.
 * @param {string} token
 * @param {object} sessionData - Arbitrary session payload (role, etc.)
 */
async function setSession(token, sessionData) {
  const key = `session:${token}`;
  
  const hashData = {};
  for (const [k, v] of Object.entries(sessionData)) {
    hashData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  
  await redisClient.hSet(key, hashData);
  await redisClient.expire(key, SESSION_TTL_SECONDS);
}

/**
 * Retrieve and refresh a session (sliding window).
 * Returns null if session expired or doesn't exist.
 * @param {string} token
 * @returns {object|null}
 */
async function getSession(token) {
  const key = `session:${token}`;
  const data = await redisClient.hGetAll(key);
  if (!data || Object.keys(data).length === 0) return null;

  // Refresh TTL on every access (sliding window)
  await redisClient.expire(key, SESSION_TTL_SECONDS);
  return data;
}

/**
 * Destroy a user session.
 * @param {string} token
 */
async function destroySession(token) {
  await redisClient.del(`session:${token}`);
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
