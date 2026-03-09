const Review = require('../models/Review');
const { validationResult } = require('express-validator');

// @desc    Get all reviews
// @route   GET /api/v1/reviews
// @access  Public
const getReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const serviceId = req.query.serviceId;
    const customerId = req.query.customerId;
    const rating = req.query.rating;

    // Build filter
    const filter = { isPublished: true };

    if (serviceId) {
      filter.serviceId = serviceId;
    }

    if (customerId) {
      filter.customerId = customerId;
    }

    if (rating) {
      filter.rating = parseInt(rating);
    }

    const skip = (page - 1) * limit;

    const reviews = await Review.find(filter)
      .populate('customerId', 'firstName lastName')
      .populate('serviceId', 'serviceName')
      .populate('response.respondedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: reviews,
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

// @desc    Get single review
// @route   GET /api/v1/reviews/:id
// @access  Public
const getReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('customerId', 'firstName lastName')
      .populate('serviceId', 'serviceName')
      .populate('response.respondedBy', 'firstName lastName');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create review
// @route   POST /api/v1/reviews
// @access  Private
const createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if user already reviewed this booking
    const existingReview = await Review.findOne({
      bookingId: req.body.bookingId,
      customerId: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this booking'
      });
    }

    const reviewData = {
      ...req.body,
      customerId: req.user._id
    };

    const review = await Review.create(reviewData);

    await review.populate('customerId', 'firstName lastName');
    await review.populate('serviceId', 'serviceName');

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review or is admin
    if (review.customerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('customerId', 'firstName lastName')
     .populate('serviceId', 'serviceName')
     .populate('response.respondedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      data: updatedReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review or is admin
    if (review.customerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Mark review as helpful
// @route   POST /api/v1/reviews/:id/helpful
// @access  Private
const markReviewHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const userId = req.user._id;
    const userIndex = review.helpful.users.indexOf(userId);

    if (userIndex > -1) {
      // User already marked as helpful, remove
      review.helpful.users.splice(userIndex, 1);
      review.helpful.count -= 1;
    } else {
      // User hasn't marked as helpful, add
      review.helpful.users.push(userId);
      review.helpful.count += 1;
    }

    await review.save();

    res.status(200).json({
      success: true,
      data: {
        helpfulCount: review.helpful.count,
        isHelpful: userIndex === -1
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

// @desc    Respond to review
// @route   POST /api/v1/reviews/:id/response
// @access  Private (Admin only)
const respondToReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.response = {
      comment: req.body.comment,
      respondedBy: req.user._id,
      respondedAt: new Date()
    };

    await review.save();
    await review.populate('response.respondedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      data: review.response
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
  getReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  respondToReview
};