const SystemSettings = require('../models/SystemSettings');
const { logger } = require('../middleware/loggerMiddleware');

class SystemSettingsService {
  // Get all system settings
  static async getSettings() {
    return await SystemSettings.getSettings();
  }

  // Update system settings
  static async updateSettings(updates, updatedBy) {
    return await SystemSettings.updateSettings(updates, updatedBy);
  }

  // Get public settings
  static async getPublicSettings() {
    const settings = await SystemSettings.getSettings();

    return {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      businessHours: settings.businessHours,
      socialLinks: settings.socialLinks,
      maintenanceMode: settings.maintenanceMode,
      currency: settings.currency,
      timezone: settings.timezone
    };
  }

  // Update maintenance mode
  static async toggleMaintenanceMode(enabled, message, estimatedEndTime, updatedBy) {
    const updates = {
      maintenanceMode: enabled,
      maintenanceMessage: message || 'We are currently under maintenance. Please check back later.',
      estimatedMaintenanceEnd: estimatedEndTime ? new Date(estimatedEndTime) : null
    };

    const settings = await SystemSettings.updateSettings(updates, updatedBy);

    logger.info(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} by user ${updatedBy}`);

    return {
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      estimatedMaintenanceEnd: settings.estimatedMaintenanceEnd
    };
  }

  // Get maintenance status
  static async getMaintenanceStatus() {
    const settings = await SystemSettings.getSettings();

    return {
      enabled: settings.maintenanceMode,
      message: settings.maintenanceMessage,
      estimatedEndTime: settings.estimatedMaintenanceEnd
    };
  }

  // Update business hours
  static async updateBusinessHours(businessHours, updatedBy) {
    return await SystemSettings.updateSettings({ businessHours }, updatedBy);
  }

  // Update contact information
  static async updateContactInfo(contactData, updatedBy) {
    const updates = {};
    if (contactData.contactEmail) updates.contactEmail = contactData.contactEmail;
    if (contactData.contactPhone) updates.contactPhone = contactData.contactPhone;

    return await SystemSettings.updateSettings(updates, updatedBy);
  }

  // Update social links
  static async updateSocialLinks(socialLinks, updatedBy) {
    return await SystemSettings.updateSettings({ socialLinks }, updatedBy);
  }
}

module.exports = SystemSettingsService;