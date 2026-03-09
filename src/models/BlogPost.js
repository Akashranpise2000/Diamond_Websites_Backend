const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  excerpt: {
    type: String,
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  featuredImage: {
    url: String,
    alt: String
  },
  images: [{
    url: String,
    alt: String,
    caption: String
  }],
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['cleaning-tips', 'industry-news', 'company-updates', 'how-to-guides']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: Date,
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
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
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isApproved: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
blogPostSchema.index({ category: 1, status: 1, publishedAt: -1 });
blogPostSchema.index({ author: 1 });
blogPostSchema.index({ tags: 1 });

// Pre-save middleware to generate slug
blogPostSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').trim('-');
  }
  next();
});

// Virtual for reading time
blogPostSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  const words = this.content.split(' ').length;
  return Math.ceil(words / wordsPerMinute);
});

// Static method to get published posts
blogPostSchema.statics.getPublishedPosts = function(limit = 10, category = null) {
  const filter = { status: 'published' };
  if (category) {
    filter.category = category;
  }

  return this.find(filter)
    .populate('author', 'firstName lastName')
    .sort({ publishedAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('BlogPost', blogPostSchema);