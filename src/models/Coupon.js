const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Coupon name is required']
  },
  description: String,
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Discount type is required']
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  minimumOrderValue: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order value cannot be negative']
  },
  maximumDiscount: {
    type: Number,
    min: [0, 'Maximum discount cannot be negative']
  },
  usageLimit: {
    type: Number,
    min: [1, 'Usage limit must be at least 1']
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required']
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
  },
  applicableServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  applicableCategories: [{
    type: String,
    enum: ['residential', 'commercial', 'deep_cleaning', 'move_in_out', 'post_construction', 'office', 'specialty']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  }
}, {
  timestamps: true
});

// Indexes
couponSchema.index({ isActive: 1, validUntil: -1 });

// Virtual for is expired
couponSchema.virtual('isExpired').get(function() {
  return new Date() > this.validUntil;
});

// Virtual for is valid
couponSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive && now >= this.validFrom && now <= this.validUntil && (!this.usageLimit || this.usageCount < this.usageLimit);
});

// Instance method to apply coupon
couponSchema.methods.applyCoupon = function(orderTotal) {
  if (!this.isValid || orderTotal < this.minimumOrderValue) {
    return { valid: false, discount: 0 };
  }

  let discount = 0;
  if (this.discountType === 'percentage') {
    discount = (orderTotal * this.discountValue) / 100;
    if (this.maximumDiscount && discount > this.maximumDiscount) {
      discount = this.maximumDiscount;
    }
  } else {
    discount = Math.min(this.discountValue, orderTotal);
  }

  return { valid: true, discount: Math.round(discount * 100) / 100 };
};

// Static method to find valid coupon
couponSchema.statics.findValidCoupon = function(code, orderTotal = 0) {
  return this.findOne({
    code: code.toUpperCase(),
    isActive: true,
    validFrom: { $lte: new Date() },
    validUntil: { $gte: new Date() },
    $or: [
      { usageLimit: { $exists: false } },
      { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
    ],
    $or: [
      { minimumOrderValue: { $lte: orderTotal } },
      { minimumOrderValue: 0 }
    ]
  });
};

module.exports = mongoose.model('Coupon', couponSchema);