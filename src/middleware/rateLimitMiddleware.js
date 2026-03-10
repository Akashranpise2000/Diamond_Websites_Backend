const rateLimit = require('express-rate-limit');
const { logger } = require('./loggerMiddleware');

// Custom key generator for IPv6 support
const ipKeyGenerator = (req) => {
  // Handle IPv6-mapped IPv4 addresses
  let ip = req.ip;
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip || 'unknown';
};

// General API rate limiter (100 requests per 15 minutes)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userId: req.user ? req.user._id : null
    });

    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Strict limiter for authentication routes (1000 attempts per hour for development)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again after an hour.',
      retryAfter: '1 hour'
    });
  }
});

// Moderate limiter for general user actions (50 requests per 15 minutes)
const userActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many actions, please slow down.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Lenient limiter for read-only operations (200 requests per 15 minutes)
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Very strict limiter for password reset and sensitive operations (3 attempts per hour)
const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 requests per windowMs
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again after an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Sensitive operation rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      success: false,
      message: 'Too many sensitive operations, please try again after an hour.',
      retryAfter: '1 hour'
    });
  }
});

// File upload limiter (10 uploads per hour)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per windowMs
  message: {
    success: false,
    message: 'Too many file uploads, please try again after an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Create account limiter (100 accounts per day per IP for development)
const createAccountLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // limit each IP to 100 account creations per windowMs
  message: {
    success: false,
    message: 'Too many account creation attempts, please try again tomorrow.',
    retryAfter: '24 hours'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Account creation rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    res.status(429).json({
      success: false,
      message: 'Too many account creation attempts, please try again tomorrow.',
      retryAfter: '24 hours'
    });
  }
});

// Booking limiter (10 bookings per hour per user)
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each user to 10 bookings per windowMs
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP with proper IPv6 handling
    if (req.user) {
      return `user_${req.user._id.toString()}`;
    }
    // Use the library's ipKeyGenerator for proper IPv6 support
    return ipKeyGenerator(req);
  },
  message: {
    success: false,
    message: 'Too many booking attempts, please try again after an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  generalLimiter,
  authLimiter,
  userActionLimiter,
  readLimiter,
  sensitiveOperationLimiter,
  uploadLimiter,
  createAccountLimiter,
  bookingLimiter
};