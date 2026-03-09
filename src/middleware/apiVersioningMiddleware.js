const { logger } = require('./loggerMiddleware');

// Supported API versions
const SUPPORTED_VERSIONS = ['v1'];
const DEFAULT_VERSION = 'v1';
const VERSION_HEADER = 'Accept-Version';
const API_PREFIX = '/api';

// Extract API version from request
const extractApiVersion = (req) => {
  // Check Accept-Version header
  const headerVersion = req.headers[VERSION_HEADER.toLowerCase()];

  // Check URL path for version
  const urlVersionMatch = req.path.match(/^\/api\/(v\d+)/i);
  const urlVersion = urlVersionMatch ? urlVersionMatch[1] : null;

  // Check query parameter
  const queryVersion = req.query.version || req.query.v;

  // Priority: URL path > header > query parameter > default
  const version = urlVersion || headerVersion || queryVersion || DEFAULT_VERSION;

  return version.toLowerCase();
};

// API versioning middleware
const apiVersioning = (req, res, next) => {
  const requestedVersion = extractApiVersion(req);

  // Validate version
  if (!SUPPORTED_VERSIONS.includes(requestedVersion)) {
    logger.warn('Unsupported API version requested', {
      requestedVersion,
      supportedVersions: SUPPORTED_VERSIONS,
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      message: `API version '${requestedVersion}' is not supported`,
      supportedVersions: SUPPORTED_VERSIONS,
      currentVersion: DEFAULT_VERSION
    });
  }

  // Add version info to request
  req.apiVersion = requestedVersion;
  res.setHeader('API-Version', requestedVersion);

  // Log version usage for analytics
  logger.debug('API version used', {
    version: requestedVersion,
    url: req.url,
    method: req.method,
    userId: req.user ? req.user._id : null
  });

  next();
};

// Version-specific route handler
const versionedRoute = (versionHandlers) => {
  return (req, res, next) => {
    const version = req.apiVersion || DEFAULT_VERSION;
    const handler = versionHandlers[version];

    if (!handler) {
      logger.error('No handler found for API version', {
        version,
        availableVersions: Object.keys(versionHandlers),
        url: req.url,
        method: req.method
      });

      return res.status(500).json({
        success: false,
        message: 'Internal server error - version handler not found'
      });
    }

    // Call the version-specific handler
    handler(req, res, next);
  };
};

// Middleware to ensure API routes use versioning
const requireVersioning = (req, res, next) => {
  if (req.path.startsWith(API_PREFIX) && !req.apiVersion) {
    logger.warn('API request without version', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      message: 'API version is required',
      supportedVersions: SUPPORTED_VERSIONS
    });
  }

  next();
};

// Deprecation warning for older versions
const deprecationWarning = (deprecatedVersions = []) => {
  return (req, res, next) => {
    const version = req.apiVersion;

    if (deprecatedVersions.includes(version)) {
      logger.warn('Deprecated API version used', {
        version,
        url: req.url,
        method: req.method,
        userId: req.user ? req.user._id : null
      });

      res.setHeader('Warning', `299 - "API version ${version} is deprecated and will be removed in a future update. Please upgrade to ${DEFAULT_VERSION}."`);
    }

    next();
  };
};

// Version compatibility layer
const versionCompatibility = (req, res, next) => {
  // Add backward compatibility transformations here
  // For example, rename fields, transform data structures, etc.

  const version = req.apiVersion;

  // Example: If version is v1, ensure certain fields are present
  if (version === 'v1') {
    // Add any v1-specific transformations
  }

  next();
};

module.exports = {
  apiVersioning,
  versionedRoute,
  requireVersioning,
  deprecationWarning,
  versionCompatibility,
  SUPPORTED_VERSIONS,
  DEFAULT_VERSION
};