const express = require('express');
const { body } = require('express-validator');
const {
  getReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  respondToReview
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation rules
const reviewValidation = [
  body('bookingId')
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  body('serviceId')
    .isMongoId()
    .withMessage('Valid service ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('comment')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Comment must be between 10 and 500 characters')
];

// Public routes
router.get('/', getReviews);
router.get('/:id', getReview);

// Protected routes (authenticated users)
router.use(protect);
router.post('/', reviewValidation, createReview);
router.put('/:id', reviewValidation, updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/helpful', markReviewHelpful);

// Admin only routes
router.post('/:id/response', authorize('admin'), [
  body('comment')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Response must be between 10 and 500 characters')
], respondToReview);

module.exports = router;