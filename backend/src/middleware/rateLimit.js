const store = require('../store');

/**
 * IP-based rate limiter backed by Firestore (production) or in-memory (dev/test).
 * Returns 429 when the limit is exceeded.
 */
function rateLimit({ maxAttempts = 10, windowMs = 15 * 60 * 1000 } = {}) {
  return async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    try {
      const result = await store.checkRateLimit(ip, maxAttempts, windowMs);

      if (!result.allowed) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }

      next();
    } catch (err) {
      // If rate limit check fails, allow the request through rather than blocking legitimate users
      console.error('Rate limit check failed:', err.message);
      next();
    }
  };
}

module.exports = { rateLimit };
