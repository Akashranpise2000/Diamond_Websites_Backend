const mongoose = require('mongoose');
const slugify = require('slugify');

const serviceSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['residential', 'commercial', 'deep_cleaning', 'move_in_out', 'post_construction', 'office', 'specialty']
  },
  subcategory: {
    type: String,
    trim: true
  },
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR']
    },
    pricePerSqFt: {
      type: Number,
      min: [0, 'Price per sq ft cannot be negative']
    },
    minimumCharge: {
      type: Number,
      min: [0, 'Minimum charge cannot be negative']
    }
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: [30, 'Duration must be at least 30 minutes']
  },
  features: [{
    type: String,
    trim: true
  }],
  inclusions: [{
    type: String,
    trim: true
  }],
  exclusions: [{
    type: String,
    trim: true
  }],
  addOns: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    price: {
      type: Number,
      required: true,
      min: [0, 'Add-on price cannot be negative']
    },
    isPopular: {
      type: Boolean,
      default: false
    }
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  videos: [{
    url: {
      type: String,
      required: true
    },
    title: String,
    thumbnail: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  popularity: {
    type: Number,
    default: 0,
    min: [0, 'Popularity cannot be negative']
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ isFeatured: 1, popularity: -1 });
serviceSchema.index({ serviceName: 'text', description: 'text', features: 'text' });
serviceSchema.index({ tags: 1 });

// Pre-save middleware to generate slug
serviceSchema.pre('save', function(next) {
  if (this.isModified('serviceName') && !this.slug) {
    this.slug = slugify(this.serviceName, { lower: true, strict: true });
  }
  next();
});

// Pre-save middleware to ensure only one primary image
serviceSchema.pre('save', function(next) {
  if (this.isModified('images')) {
    const primaryImages = this.images.filter(img => img.isPrimary);
    if (primaryImages.length > 1) {
      // Set only the first one as primary
      this.images.forEach((img, index) => {
        img.isPrimary = index === 0;
      });
    }
  }
  next();
});

// Virtual for primary image
serviceSchema.virtual('primaryImage').get(function() {
  return this.images.find(img => img.isPrimary) || this.images[0];
});

// Virtual for formatted price
serviceSchema.virtual('formattedPrice').get(function() {
  return `${this.pricing.currency} ${this.pricing.basePrice}`;
});

// Instance method to update rating
serviceSchema.methods.updateRating = function(newRating) {
  const totalRating = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (totalRating + newRating) / this.rating.count;
};

// Static method to get services by category with aggregation
serviceSchema.statics.getServicesWithStats = function(category = null) {
  const matchStage = { isActive: true };
  if (category) {
    matchStage.category = category;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'services.serviceId',
        as: 'bookings'
      }
    },
    {
      $addFields: {
        bookingCount: { $size: '$bookings' },
        totalRevenue: {
          $sum: {
            $map: {
              input: '$bookings',
              as: 'booking',
              in: '$$booking.pricing.total'
            }
          }
        }
      }
    },
    {
      $sort: { popularity: -1, bookingCount: -1 }
    }
  ]);
};

// Static method to search services
serviceSchema.statics.search = function(query, limit = 20) {
  return this.find({
    isActive: true,
    $or: [
      { serviceName: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { features: { $regex: query, $options: 'i' } },
      { category: { $regex: query, $options: 'i' } },
      { tags: { $regex: query, $options: 'i' } }
    ]
  })
  .sort({ popularity: -1 })
  .limit(limit);
};

module.exports = mongoose.model('Service', serviceSchema);