const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking ID is required']
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['razorpay', 'cash', 'bank_transfer', 'card', 'upi', 'wallet'],
    default: 'razorpay'
  },
  gateway: {
    type: String,
    enum: ['razorpay', 'stripe', 'paypal'],
    default: 'razorpay'
  },
  gatewayOrderId: {
    type: String,
    index: true
  },
  gatewayTransactionId: {
    type: String,
    index: true
  },
  status: {
    type: String,
    enum: ['initiated', 'pending', 'success', 'failed', 'cancelled', 'refunded'],
    default: 'initiated',
    index: true
  },
  paymentDetails: {
    // Razorpay specific fields
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    // Generic payment gateway fields
    gatewayResponse: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed
  },
  refund: {
    isRefunded: {
      type: Boolean,
      default: false
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative']
    },
    refundTransactionId: String,
    refundedAt: Date,
    refundReason: String,
    refundGatewayResponse: mongoose.Schema.Types.Mixed,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  invoice: {
    invoiceNumber: String,
    invoiceUrl: String,
    generatedAt: Date
  },
  notes: String,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return `${this.currency} ${this.amount}`;
});

// Virtual for refund status
paymentSchema.virtual('isFullyRefunded').get(function() {
  return this.refund.isRefunded && this.refund.refundAmount >= this.amount;
});

// Pre-save middleware to generate transaction ID if not provided
paymentSchema.pre('save', function(next) {
  if (this.isNew && !this.transactionId) {
    // Generate transaction ID: TXN + timestamp + random
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.transactionId = `TXN${timestamp}${random}`;
  }
  next();
});

// Instance method to check if payment can be refunded
paymentSchema.methods.canRefund = function() {
  const refundableStatuses = ['success'];
  const nonRefundableStatuses = ['refunded', 'failed', 'cancelled'];

  return refundableStatuses.includes(this.status) &&
         !nonRefundableStatuses.includes(this.status) &&
         !this.refund.isRefunded;
};

// Instance method to process refund
paymentSchema.methods.processRefund = async function(refundAmount, reason, processedBy) {
  if (!this.canRefund()) {
    throw new Error('Payment cannot be refunded');
  }

  if (refundAmount > this.amount) {
    throw new Error('Refund amount cannot exceed payment amount');
  }

  this.refund = {
    isRefunded: true,
    refundAmount,
    refundedAt: new Date(),
    refundReason: reason,
    processedBy
  };

  // If full refund, update status
  if (refundAmount >= this.amount) {
    this.status = 'refunded';
  }

  return this.save();
};

// Static method to get payments by date range
paymentSchema.statics.getPaymentsByDateRange = function(startDate, endDate, status = null) {
  const filter = {
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  };

  if (status) {
    filter.status = status;
  }

  return this.find(filter)
    .populate('bookingId', 'bookingNumber scheduledDate')
    .populate('customerId', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        },
        status: 'success'
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalPayments: { $sum: 1 },
        averageAmount: { $avg: '$amount' },
        paymentMethods: {
          $push: '$paymentMethod'
        }
      }
    },
    {
      $project: {
        totalAmount: 1,
        totalPayments: 1,
        averageAmount: { $round: ['$averageAmount', 2] },
        paymentMethodBreakdown: {
          $reduce: {
            input: '$paymentMethods',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $cond: {
                    if: { $ne: ['$$this', null] },
                    then: { $literal: { [$$this]: { $add: [{ $ifNull: ['$$value.$$this', 0] }, 1] } } },
                    else: {}
                  }
                }
              ]
            }
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Payment', paymentSchema);