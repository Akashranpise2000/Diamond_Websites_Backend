const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: String,
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['before_after', 'work_progress', 'team', 'equipment', 'certifications', 'events']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      required: true
    },
    caption: String,
    order: {
      type: Number,
      default: 0
    },
    metadata: {
      width: Number,
      height: Number,
      size: Number,
      format: String
    }
  }],
  videos: [{
    url: {
      type: String,
      required: true
    },
    title: String,
    thumbnail: String,
    duration: Number,
    order: {
      type: Number,
      default: 0
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploaded by is required']
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }
}, {
  timestamps: true
});

// Indexes
gallerySchema.index({ category: 1, isActive: 1, createdAt: -1 });
gallerySchema.index({ isFeatured: 1 });
gallerySchema.index({ tags: 1 });

module.exports = mongoose.model('Gallery', gallerySchema);