const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { logger } = require('./loggerMiddleware');

// MongoDB injection protection
const mongoSanitizeMiddleware = (req, res, next) => {
  // Check for MongoDB operators in all inputs
  const checkMongoOperators = (obj, path = '') => {
    const mongoOperators = [
      '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$exists', '$type',
      '$regex', '$options', '$text', '$search', '$where', '$expr', '$jsonSchema',
      '$all', '$elemMatch', '$size', '$and', '$or', '$nor', '$not', '$mod', '$near',
      '$nearSphere', '$geoWithin', '$geoIntersects', '$geometry', '$maxDistance',
      '$minDistance', '$center', '$centerSphere', '$box', '$polygon', '$slice',
      '$sort', '$limit', '$skip', '$project', '$group', '$match', '$lookup', '$unwind',
      '$addFields', '$set', '$unset', '$replaceRoot', '$facet', '$bucket', '$count'
    ];

    for (let key in obj) {
      const value = obj[key];
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof key === 'string' && key.startsWith('$')) {
        if (mongoOperators.includes(key)) {
          logger.warn('Potential MongoDB injection detected', {
            operator: key,
            field: currentPath,
            url: req.url,
            method: req.method,
            ip: req.ip,
            userId: req.user ? req.user._id : null
          });

          return res.status(400).json({
            success: false,
            message: 'Invalid input detected'
          });
        }
      }

      if (typeof value === 'object' && value !== null) {
        const result = checkMongoOperators(value, currentPath);
        if (result) return result;
      }
    }
    return null;
  };

  // Check all input sources
  if (req.body && typeof req.body === 'object') {
    const result = checkMongoOperators(req.body);
    if (result) return result;
  }

  if (req.query && typeof req.query === 'object') {
    const result = checkMongoOperators(req.query);
    if (result) return result;
  }

  if (req.params && typeof req.params === 'object') {
    const result = checkMongoOperators(req.params);
    if (result) return result;
  }

  // Sanitize body and params (but not query due to read-only issues)
  if (req.body) {
    mongoSanitize.sanitize(req.body);
  }
  if (req.params) {
    mongoSanitize.sanitize(req.params);
  }

  next();
};

// XSS protection
const xssMiddleware = (req, res, next) => {
  // Check for XSS patterns in all inputs
  const checkXSS = (obj, path = '') => {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,
      /onmouseout\s*=/gi,
      /onkeydown\s*=/gi,
      /onkeyup\s*=/gi,
      /onkeypress\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
      /expression\s*\(/gi,
      /vbscript\s*:/gi,
      /data\s*:\s*text\/html/gi,
      /<link[^>]*>.*?<\/link>/gi,
      /<meta[^>]*>.*?<\/meta>/gi
    ];

    for (let key in obj) {
      const value = obj[key];
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        for (const pattern of xssPatterns) {
          if (pattern.test(value)) {
            logger.warn('Potential XSS attack detected', {
              pattern: pattern.toString(),
              field: currentPath,
              value: value.substring(0, 100),
              url: req.url,
              method: req.method,
              ip: req.ip,
              userId: req.user ? req.user._id : null
            });

            return res.status(400).json({
              success: false,
              message: 'Invalid input detected'
            });
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = checkXSS(value, currentPath);
        if (result) return result;
      }
    }
    return null;
  };

  // Check all input sources
  if (req.body && typeof req.body === 'object') {
    const result = checkXSS(req.body);
    if (result) return result;
  }

  if (req.query && typeof req.query === 'object') {
    const result = checkXSS(req.query);
    if (result) return result;
  }

  if (req.params && typeof req.params === 'object') {
    const result = checkXSS(req.params);
    if (result) return result;
  }

  // Skip xss-clean entirely due to read-only req.query issues in newer Node.js
  // Only use our custom XSS checking above
  next();
};

// HTTP Parameter Pollution protection
const hppMiddleware = hpp({
  whitelist: [
    'duration',
    'price',
    'rating',
    'limit',
    'page',
    'sort'
  ]
});

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Content Security Policy
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.razorpay.com; " +
    "frame-src 'self' https://api.razorpay.com; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  next();
};

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length']);

  if (contentLength && contentLength > 10 * 1024 * 1024) { // 10MB limit
    logger.warn('Request too large', {
      contentLength,
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    return res.status(413).json({
      success: false,
      message: 'Request entity too large'
    });
  }

  next();
};

// SQL injection basic protection (additional to MongoDB protection)
const sqlInjectionProtection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
    /('|(\\x27)|(\\x2D\\x2D)|(\\#)|(\%27)|(\%23))/i,
    /(<script|javascript:|vbscript:|onload=|onerror=)/i
  ];

  const checkObject = (obj, path = '') => {
    for (let key in obj) {
      const value = obj[key];
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            logger.warn('Potential security threat detected', {
              pattern: pattern.toString(),
              field: currentPath,
              value: value.substring(0, 100),
              url: req.url,
              method: req.method,
              ip: req.ip,
              userId: req.user ? req.user._id : null
            });

            return res.status(400).json({
              success: false,
              message: 'Invalid input detected'
            });
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = checkObject(value, currentPath);
        if (result) return result;
      }
    }
    return null;
  };

  if (req.body && typeof req.body === 'object') {
    const result = checkObject(req.body);
    if (result) return result;
  }

  if (req.query && typeof req.query === 'object') {
    const result = checkObject(req.query);
    if (result) return result;
  }

  next();
};

// API key validation for external requests (if needed)
const apiKeyValidation = (req, res, next) => {
  // Skip for web routes, only apply to API routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  // Add API key validation logic here if needed
  // For now, just pass through
  next();
};

// Request timeout middleware
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          url: req.url,
          method: req.method,
          ip: req.ip,
          userId: req.user ? req.user._id : null,
          timeout: timeoutMs
        });

        res.status(408).json({
          success: false,
          message: 'Request timeout'
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

module.exports = {
  mongoSanitizeMiddleware,
  xssMiddleware,
  hppMiddleware,
  securityHeaders,
  requestSizeLimiter,
  sqlInjectionProtection,
  apiKeyValidation,
  requestTimeout
};