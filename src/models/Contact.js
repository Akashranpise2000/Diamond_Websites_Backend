const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    validate: {
      validator: function(email) {
        return /\S+@\S+\.\S+/.test(email);
      },
      message: 'Please enter a valid email'
    }
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(phone) {
        return /^\+?[\d\s-()]{10,}$/.test(phone);
      },
      message: 'Please enter a valid phone number'
    }
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    default: 'pending'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow anonymous submissions
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });
contactSchema.index({ submittedBy: 1 });

// Virtual for submittedAt (alias for createdAt)
contactSchema.virtual('submittedAt').get(function() {
  return this.createdAt;
});

// Instance method to check if contact can be updated
contactSchema.methods.canUpdate = function(userRole, userId) {
  // Admins can update any contact
  if (userRole === 'admin') {
    return true;
  }

  // Users can only update their own contacts if they're not resolved
  if (userRole === 'customer' && this.submittedBy?.toString() === userId?.toString()) {
    return ['pending', 'in_progress'].includes(this.status);
  }

  return false;
};

module.exports = mongoose.model('Contact', contactSchema);