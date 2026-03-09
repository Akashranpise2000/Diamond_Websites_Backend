const express = require('express');
const { body } = require('express-validator');
const {
  getGalleryItems,
  getGalleryItem,
  getGalleryCategories,
  getGalleryTags,
  toggleGalleryItemLike,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem
} = require('../controllers/galleryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation rules for gallery item creation/update
const galleryItemValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .isIn(['before_after', 'work_progress', 'team', 'equipment', 'certifications', 'events'])
    .withMessage('Invalid category'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('Image URL must be valid'),
  body('images.*.alt')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Image alt text must be between 3 and 200 characters'),
  body('videos')
    .optional()
    .isArray()
    .withMessage('Videos must be an array'),
  body('videos.*.url')
    .optional()
    .isURL()
    .withMessage('Video URL must be valid'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Each tag must be between 2 and 30 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean')
];

// Public routes
router.get('/', getGalleryItems);
router.get('/categories', getGalleryCategories);
router.get('/tags', getGalleryTags);
router.get('/:id', getGalleryItem);

// Protected routes (authenticated users)
router.use(protect);
router.post('/:id/like', toggleGalleryItemLike);

// Admin routes
router.post('/', authorize('admin'), galleryItemValidation, createGalleryItem);
router.put('/:id', authorize('admin'), galleryItemValidation, updateGalleryItem);
router.delete('/:id', authorize('admin'), deleteGalleryItem);

module.exports = router;