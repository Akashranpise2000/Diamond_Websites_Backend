const express = require('express');
const { body } = require('express-validator');
const {
  getBlogPosts,
  getBlogPost,
  getBlogPostBySlug,
  getBlogCategories,
  getBlogTags,
  toggleBlogPostLike,
  addBlogPostComment,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost
} = require('../controllers/blogController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

const router = express.Router();

// Validation rules for blog post creation/update
const blogPostValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('content')
    .trim()
    .isLength({ min: 50 })
    .withMessage('Content must be at least 50 characters'),
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Excerpt cannot exceed 300 characters'),
  body('category')
    .isIn(['cleaning-tips', 'industry-news', 'company-updates', 'how-to-guides'])
    .withMessage('Invalid category'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Each tag must be between 2 and 30 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  body('seo.metaTitle')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('Meta title cannot exceed 60 characters'),
  body('seo.metaDescription')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Meta description cannot exceed 160 characters'),
  body('seo.keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  body('seo.keywords.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Each keyword must be between 2 and 50 characters')
];

// Comment validation
const commentValidation = [
  body('comment')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Comment must be between 5 and 500 characters')
];

// Public routes
router.get('/', getBlogPosts);
router.get('/categories', getBlogCategories);
router.get('/tags', getBlogTags);
router.get('/slug/:slug', getBlogPostBySlug);
router.get('/:id', getBlogPost);

// Protected routes (authenticated users)
router.use(protect);
router.post('/:id/like', toggleBlogPostLike);
router.post('/:id/comments', commentValidation, addBlogPostComment);

// Admin/Author routes
router.post('/', blogPostValidation, handleValidationErrors, createBlogPost);
router.put('/:id', blogPostValidation, handleValidationErrors, updateBlogPost);
router.delete('/:id', deleteBlogPost);

module.exports = router;