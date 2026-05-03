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
 * @param {string} userId
 * @param {object} sessionData - Arbitrary session payload (role, etc.)
 */
async function setSession(userId, sessionData) {
  const key = `session:${userId}`;
  const ttl = sessionData.role === 'PARTICIPANT' ? PARTICIPANT_TTL_SECONDS : SESSION_TTL_SECONDS;
  await redisClient.set(key, JSON.stringify(sessionData), { EX: ttl });
}

/**
 * Retrieve and refresh a session (sliding window).
 * Returns null if session expired or doesn't exist.
 * @param {string} userId
 * @returns {object|null}
 */
async function getSession(userId) {
  const key = `session:${userId}`;
  const data = await redisClient.get(key);
  if (!data) return null;

  const sessionData = JSON.parse(data);
  const ttl = sessionData.role === 'PARTICIPANT' ? PARTICIPANT_TTL_SECONDS : SESSION_TTL_SECONDS;

  // Refresh TTL on every access (sliding window)
  await redisClient.expire(key, ttl);
  return sessionData;
}

/**
 * Destroy a user session.
 * @param {string} userId
 */
async function destroySession(userId) {
  await redisClient.del(`session:${userId}`);
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
