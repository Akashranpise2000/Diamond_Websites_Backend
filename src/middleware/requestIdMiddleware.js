const { v4: uuidv4 } = require('uuid');
const { logger } = require('./loggerMiddleware');

// Generate unique request ID for tracking
const requestId = (req, res, next) => {
  const id = uuidv4();

  // Add request ID to request and response objects
  req.id = id;
  res.setHeader('X-Request-ID', id);

  // Add request ID to logger context
  req.logger = logger.child({ requestId: id });

  next();
};

// Request logging with ID
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log incoming request
  req.logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user._id : null,
    body: req.method !== 'GET' && req.body ? JSON.stringify(req.body).substring(0, 500) : undefined,
    query: req.query,
    params: req.params
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    req.logger[logLevel]('Request completed', {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      userId: req.user ? req.user._id : null
    });
  });

  // Log response errors
  res.on('error', (error) => {
    req.logger.error('Response error', {
      error: error.message,
      stack: error.stack,
      statusCode: res.statusCode,
      userId: req.user ? req.user._id : null
    });
  });

  next();
};

module.exports = {
  requestId,
  requestLogger
};