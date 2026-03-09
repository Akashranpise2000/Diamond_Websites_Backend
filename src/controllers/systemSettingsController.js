const SystemSettingsService = require('../services/systemSettingsService');

// @desc    Get system settings
// @route   GET /api/v1/system-settings
// @access  Public/Private (depending on setting type)
const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update system settings
// @route   PUT /api/v1/system-settings
// @access  Private (Admin only)
const updateSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.updateSettings(req.body, req.user._id);

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get public settings (no auth required)
// @route   GET /api/v1/system-settings/public
// @access  Public
const getPublicSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();

    const publicSettings = {
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

    res.status(200).json({
      success: true,
      data: publicSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Toggle maintenance mode
// @route   POST /api/v1/admin/maintenance
// @access  Private (Admin only)
const toggleMaintenanceMode = async (req, res) => {
  try {
    const { enabled, message, estimatedEndTime } = req.body;

    const updates = {
      maintenanceMode: enabled,
      maintenanceMessage: message || 'We are currently under maintenance. Please check back later.',
      estimatedMaintenanceEnd: estimatedEndTime ? new Date(estimatedEndTime) : null
    };

    const settings = await SystemSettings.updateSettings(updates, req.user._id);

    logger.info('Maintenance mode toggled', {
      enabled,
      adminId: req.user._id,
      adminEmail: req.user.email
    });

    res.status(200).json({
      success: true,
      data: {
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        estimatedMaintenanceEnd: settings.estimatedMaintenanceEnd
      },
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    logger.error('Error toggling maintenance mode', {
      error: error.message,
      adminId: req.user._id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to toggle maintenance mode',
      error: error.message
    });
  }
};

module.exports = {
  getSystemSettings,
  updateSystemSettings,
  getPublicSettings,
  toggleMaintenanceMode
};