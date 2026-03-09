const Gallery = require('../models/Gallery');
const { validationResult } = require('express-validator');

// @desc    Get all gallery items
// @route   GET /api/v1/gallery
// @access  Public
const getGalleryItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const category = req.query.category;
    const tag = req.query.tag;
    const featured = req.query.featured === 'true';

    // Build filter
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (tag) {
      filter.tags = { $in: [tag] };
    }

    if (featured) {
      filter.isFeatured = true;
    }

    const skip = (page - 1) * limit;

    const galleryItems = await Gallery.find(filter)
      .populate('uploadedBy', 'firstName lastName')
      .populate('serviceId', 'serviceName')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Gallery.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: galleryItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single gallery item
// @route   GET /api/v1/gallery/:id
// @access  Public
const getGalleryItem = async (req, res) => {
  try {
    const galleryItem = await Gallery.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName')
      .populate('serviceId', 'serviceName');

    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found'
      });
    }

    // Increment view count
    galleryItem.views += 1;
    await galleryItem.save();

    res.status(200).json({
      success: true,
      data: galleryItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get gallery categories
// @route   GET /api/v1/gallery/categories
// @access  Public
const getGalleryCategories = async (req, res) => {
  try {
    const categories = await Gallery.distinct('category', { isActive: true });

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get gallery tags
// @route   GET /api/v1/gallery/tags
// @access  Public
const getGalleryTags = async (req, res) => {
  try {
    const tags = await Gallery.distinct('tags', { isActive: true });

    res.status(200).json({
      success: true,
      data: tags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Like/unlike gallery item
// @route   POST /api/v1/gallery/:id/like
// @access  Private
const toggleGalleryItemLike = async (req, res) => {
  try {
    const galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found'
      });
    }

    const userId = req.user._id;
    const userIndex = galleryItem.likes.users.indexOf(userId);

    if (userIndex > -1) {
      // User already liked, remove like
      galleryItem.likes.users.splice(userIndex, 1);
      galleryItem.likes.count -= 1;
    } else {
      // User hasn't liked, add like
      galleryItem.likes.users.push(userId);
      galleryItem.likes.count += 1;
    }

    await galleryItem.save();

    res.status(200).json({
      success: true,
      data: {
        likes: galleryItem.likes.count,
        isLiked: userIndex === -1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create gallery item
// @route   POST /api/v1/gallery
// @access  Private (Admin only)
const createGalleryItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const galleryItemData = {
      ...req.body,
      uploadedBy: req.user._id
    };

    const galleryItem = await Gallery.create(galleryItemData);

    await galleryItem.populate('uploadedBy', 'firstName lastName');
    await galleryItem.populate('serviceId', 'serviceName');

    res.status(201).json({
      success: true,
      data: galleryItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update gallery item
// @route   PUT /api/v1/gallery/:id
// @access  Private (Admin only)
const updateGalleryItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found'
      });
    }

    // Check if user is the uploader or admin
    if (galleryItem.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this gallery item'
      });
    }

    const updatedGalleryItem = await Gallery.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('uploadedBy', 'firstName lastName')
     .populate('serviceId', 'serviceName');

    res.status(200).json({
      success: true,
      data: updatedGalleryItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete gallery item
// @route   DELETE /api/v1/gallery/:id
// @access  Private (Admin only)
const deleteGalleryItem = async (req, res) => {
  try {
    const galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found'
      });
    }

    // Check if user is the uploader or admin
    if (galleryItem.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this gallery item'
      });
    }

    await Gallery.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Gallery item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getGalleryItems,
  getGalleryItem,
  getGalleryCategories,
  getGalleryTags,
  toggleGalleryItemLike,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem
};