const Maintenance = require('../models/Maintenance');
const { logger } = require('../middleware/loggerMiddleware');

class MaintenanceService {
  // Get current maintenance status
  static async getCurrentMaintenance() {
    return await Maintenance.getCurrentMaintenance();
  }

  // Toggle maintenance mode
  static async toggleMaintenance(enabled, message, estimatedEndTime, initiatedBy) {
    const result = await Maintenance.toggleMaintenance(enabled, message, estimatedEndTime, initiatedBy);

    logger.info(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} by user ${initiatedBy}`);

    return result;
  }

  // Get maintenance history
  static async getMaintenanceHistory(limit = 10) {
    return await Maintenance.find({})
      .populate('initiatedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  // Check if maintenance is active
  static async isMaintenanceActive() {
    const maintenance = await Maintenance.getCurrentMaintenance();
    return !!maintenance;
  }

  // Get maintenance details for API response
  static async getMaintenanceDetails() {
    const maintenance = await Maintenance.getCurrentMaintenance();

    if (!maintenance) {
      return null;
    }

    return {
      enabled: maintenance.enabled,
      message: maintenance.message,
      estimatedEndTime: maintenance.estimatedEndTime,
      startedAt: maintenance.startedAt
    };
  }
}

module.exports = MaintenanceService;