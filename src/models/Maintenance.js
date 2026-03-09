const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: 'We are currently under maintenance. Please check back later.',
    trim: true
  },
  estimatedEndTime: {
    type: Date
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Ensure only one active maintenance record
maintenanceSchema.pre('save', async function(next) {
  if (this.enabled && this.isModified('enabled')) {
    // Disable any other active maintenance
    await mongoose.model('Maintenance').updateMany(
      { enabled: true, _id: { $ne: this._id } },
      { enabled: false, endedAt: new Date() }
    );
  }
  next();
});

// Static method to get current maintenance status
maintenanceSchema.statics.getCurrentMaintenance = async function() {
  return await this.findOne({ enabled: true }).sort({ createdAt: -1 });
};

// Static method to toggle maintenance
maintenanceSchema.statics.toggleMaintenance = async function(enabled, message, estimatedEndTime, initiatedBy) {
  const current = await this.getCurrentMaintenance();

  if (enabled) {
    // Enable maintenance
    if (current) {
      // Update existing
      current.message = message || current.message;
      current.estimatedEndTime = estimatedEndTime ? new Date(estimatedEndTime) : null;
      return await current.save();
    } else {
      // Create new
      return await this.create({
        enabled: true,
        message: message || 'We are currently under maintenance. Please check back later.',
        estimatedEndTime: estimatedEndTime ? new Date(estimatedEndTime) : null,
        initiatedBy
      });
    }
  } else {
    // Disable maintenance
    if (current) {
      current.enabled = false;
      current.endedAt = new Date();
      return await current.save();
    }
    return null;
  }
};

module.exports = mongoose.model('Maintenance', maintenanceSchema);