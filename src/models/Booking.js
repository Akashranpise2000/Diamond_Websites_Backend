const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true,
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow anonymous bookings
  },
  services: [{
    serviceId: {
      type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String for mock data
      ref: 'Service',
      required: true
    },
    serviceName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    basePrice: {
      type: Number,
      required: true,
      min: [0, 'Base price cannot be negative']
    },
    addOns: [{
      name: {
        type: String,
        required: true
      },
      price: {
        type: Number,
        required: true,
        min: [0, 'Add-on price cannot be negative']
      }
    }],
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    }
  }],
  serviceAddress: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      minlength: [1, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      minlength: [1, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      minlength: [1, 'State is required']
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required'],
      match: [/^\d{5,6}$/, 'Zip code must be 5-6 digits']
    },
    country: {
      type: String,
      default: 'India'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required'],
    validate: {
      validator: function(date) {
        // Allow dates from today onwards (start of day UTC)
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        return date >= today;
      },
      message: 'Scheduled date cannot be in the past'
    }
  },
  scheduledTimeSlot: {
    type: String,
    required: [true, 'Time slot is required'],
    enum: ['9:00 AM - 11:00 AM', '11:00 AM - 1:00 PM', '2:00 PM - 4:00 PM', '4:00 PM - 6:00 PM']
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },
    tax: {
      type: Number,
      required: true,
      min: [0, 'Tax cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative']
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  assignedStaff: [{
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['lead', 'helper'],
      default: 'helper'
    }
  }],
  specialInstructions: {
    type: String,
    maxlength: [500, 'Special instructions cannot exceed 500 characters']
  },
  completion: {
    completedAt: Date,
    notes: String,
    photos: [String], // URLs to completion photos
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String
  },
  cancellation: {
    isCancelled: {
      type: Boolean,
      default: false
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    cancellationReason: String,
    refundAmount: Number
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  notifications: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push']
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending'],
      default: 'pending'
    }
  }],
  customFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, scheduledDate: 1 });
bookingSchema.index({ assignedStaff: 1 });

// Note: Booking number generation is now handled in the BookingService.createBooking method

// Virtual for duration (calculated from services)
bookingSchema.virtual('estimatedDuration').get(function() {
  // Assuming each service has a duration, sum them up
  return this.services.reduce((total, service) => {
    // This would need to be calculated based on service duration
    return total + (service.quantity * 60); // Default 60 minutes per service
  }, 0);
});

// Instance method to check if booking can be cancelled
bookingSchema.methods.canCancel = function() {
  const now = new Date();
  const scheduledTime = new Date(this.scheduledDate);

  // Cannot cancel if less than 2 hours before scheduled time
  const twoHoursBefore = new Date(scheduledTime.getTime() - 2 * 60 * 60 * 1000);

  return now < twoHoursBefore && ['pending', 'confirmed'].includes(this.status);
};

// Instance method to check if booking can be rescheduled
bookingSchema.methods.canReschedule = function() {
  const now = new Date();
  const scheduledTime = new Date(this.scheduledDate);

  // Cannot reschedule if less than 4 hours before scheduled time
  const fourHoursBefore = new Date(scheduledTime.getTime() - 4 * 60 * 60 * 1000);

  return now < fourHoursBefore && ['pending', 'confirmed', 'assigned'].includes(this.status);
};

// Static method to get bookings by date range
bookingSchema.statics.getBookingsByDateRange = function(startDate, endDate, status = null) {
  const filter = {
    scheduledDate: {
      $gte: startDate,
      $lte: endDate
    }
  };

  if (status) {
    filter.status = status;
  }

  return this.find(filter).populate('customerId', 'firstName lastName email phone');
};

module.exports = mongoose.model('Booking', bookingSchema);
