function getClientIp(req) {
  // Trusting proxy is environment-dependent; keep it simple.
  // Express will set req.ip using trust proxy settings if configured.
  return (req.ip || req.connection?.remoteAddress || '').toString();
}

/**
 * Very small in-memory rate limiter.
 * - Not shared across instances
 * - Resets counters per window
 */
function rateLimit({ windowMs = 60_000, max = 120, keyPrefix = 'rl' } = {}) {
  const buckets = new Map();

  return function rateLimitMiddleware(req, res, next) {
    try {
      const now = Date.now();
      const ip = getClientIp(req);
      const key = `${keyPrefix}:${ip}:${req.baseUrl || ''}`;

      const current = buckets.get(key);
      if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        res.setHeader('X-RateLimit-Limit', String(max));
        res.setHeader('X-RateLimit-Remaining', String(max - 1));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));
        return next();
      }

      current.count += 1;
      const remaining = Math.max(0, max - current.count);
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));

      if (current.count > max) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please slow down and try again.'
        });
      }

      return next();
    } catch (err) {
      return next();
    }
  };
}

module.exports = { rateLimit };
