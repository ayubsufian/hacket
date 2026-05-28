const { redisClient } = require('../config/redis');
const jwt = require('jsonwebtoken');

/**
 * Middleware: Tracks unique active users using Redis HyperLogLog
 * as required by the Cache Schema.
 */
const activeUsersMetrics = async (req, res, next) => {
  try {
    if (redisClient.isOpen) {
      let identifier = req.ip || 'anonymous';

      // Try to parse token for true user ID
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
          const decoded = jwt.decode(token);
          if (decoded && decoded.id) {
            identifier = decoded.id;
          }
        } catch (e) {}
      }
      
      const key = 'metrics:active';
      
      // Add user/IP to HyperLogLog
      await redisClient.pfAdd(key, identifier);
      
      // Set TTL to 1 hour (3600 seconds)
      await redisClient.expire(key, 60 * 60);
    }
  } catch (err) {
    // Fail silently, metrics should not break the app
    console.warn('[Metrics] Redis HyperLogLog error:', err.message);
  }
  next();
};

module.exports = activeUsersMetrics;
