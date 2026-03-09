const MaintenanceService = require('../services/maintenanceService');
const { logger } = require('./loggerMiddleware');

// Check if system is in maintenance mode
const checkMaintenanceMode = async (req, res, next) => {
  try {
    // Skip maintenance check for health checks and admin routes
    if (req.path === '/api/v1/health' ||
        req.path.startsWith('/api/v1/auth') ||
        req.path.startsWith('/api/v1/system-settings') ||
        (req.user && req.user.role === 'admin')) {
      return next();
    }

    const maintenanceDetails = await MaintenanceService.getMaintenanceDetails();

    if (maintenanceDetails) {
      logger.info('Maintenance mode active - blocking request', {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userId: req.user ? req.user._id : null
      });

      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable',
        maintenance: true,
        details: maintenanceDetails.message,
        estimatedTime: maintenanceDetails.estimatedEndTime ?
          maintenanceDetails.estimatedEndTime.toISOString() : null
      });
    }

    next();
  } catch (error) {
    logger.error('Error checking maintenance mode', {
      error: error.message,
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    // If we can't check maintenance mode, allow the request to proceed
    next();
  }
};

// Admin middleware to enable/disable maintenance mode
const requireMaintenanceAccess = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required for maintenance operations'
    });
  }

  next();
};

// Import the controller function
const { toggleMaintenanceMode } = require('../controllers/systemSettingsController');

module.exports = {
  checkMaintenanceMode,
  requireMaintenanceAccess,
  toggleMaintenanceMode
};