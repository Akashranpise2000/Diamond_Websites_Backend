const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // General settings
  siteName: {
    type: String,
    default: 'Diamond House Cleaning Services',
    trim: true
  },
  siteDescription: {
    type: String,
    default: 'Professional cleaning services for your home and office',
    trim: true
  },
  contactEmail: {
    type: String,
    default: 'info@diamondhousecleaning.com',
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    default: '+91-9850781897',
    trim: true
  },
  businessHours: {
    monday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      closed: { type: Boolean, default: false }
    },
    tuesday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      closed: { type: Boolean, default: false }
    },
    wednesday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      closed: { type: Boolean, default: false }
    },
    thursday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      closed: { type: Boolean, default: false }
    },
    friday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      closed: { type: Boolean, default: false }
    },
    saturday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '16:00' },
      closed: { type: Boolean, default: false }
    },
    sunday: {
      open: { type: String, default: '00:00' },
      close: { type: String, default: '00:00' },
      closed: { type: Boolean, default: true }
    }
  },
  socialLinks: {
    facebook: { type: String, default: '', trim: true },
    instagram: { type: String, default: '', trim: true },
    twitter: { type: String, default: '', trim: true },
    linkedin: { type: String, default: '', trim: true }
  },

  // Maintenance settings
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: 'We are currently under maintenance. Please check back later.',
    trim: true
  },
  estimatedMaintenanceEnd: {
    type: Date
  },

  // Other settings
  currency: {
    type: String,
    default: 'INR',
    trim: true
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata',
    trim: true
  },

  // Booking settings
  bookingAdvanceNoticeHours: {
    type: Number,
    default: 24,
    min: [1, 'Advance notice must be at least 1 hour']
  },
  bookingCancellationHours: {
    type: Number,
    default: 2,
    min: [0, 'Cancellation hours cannot be negative']
  },
  bookingRescheduleHours: {
    type: Number,
    default: 4,
    min: [0, 'Reschedule hours cannot be negative']
  },

  // Pricing settings
  gstRate: {
    type: Number,
    default: 18,
    min: [0, 'GST rate cannot be negative'],
    max: [100, 'GST rate cannot exceed 100%']
  },
  minimumServiceCharge: {
    type: Number,
    default: 500,
    min: [0, 'Minimum service charge cannot be negative']
  },

  // Payment settings
  paymentGateway: {
    type: String,
    default: 'razorpay',
    trim: true
  },

  // Notification settings
  emailNotifications: {
    type: Boolean,
    default: true
  },
  smsNotifications: {
    type: Boolean,
    default: true
  },

  // Security settings
  sessionTimeout: {
    type: Number,
    default: 24,
    min: [1, 'Session timeout must be at least 1 hour']
  },
  passwordMinLength: {
    type: Number,
    default: 6,
    min: [4, 'Password minimum length must be at least 4']
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Static method to get settings (ensure single document)
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Static method to update settings
systemSettingsSchema.statics.updateSettings = async function(updates, updatedBy = null) {
  const settings = await this.getSettings();
  Object.assign(settings, updates);
  if (updatedBy) {
    settings.updatedBy = updatedBy;
  }
  return settings.save();
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);