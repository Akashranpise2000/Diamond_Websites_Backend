const express = require('express');
const { body } = require('express-validator');
const {
  getServices,
  getService,
  getServiceBySlug,
  getServicesByCategory,
  getFeaturedServices,
  searchServices,
  createService,
  updateService,
  deleteService
} = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

const router = express.Router();

// Public routes
router.get('/', getServices);
router.get('/featured', getFeaturedServices);
router.get('/search', searchServices);
router.get('/category/:category', getServicesByCategory);
router.get('/slug/:slug', getServiceBySlug);
router.get('/:id', getService);

// Validation rules for service creation/update
const serviceValidation = [
  body('serviceName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),
  body('category')
    .isIn([
      'regular-cleaning',
      'deep-cleaning',
      'office-cleaning',
      'carpet-cleaning',
      'upholstery-cleaning',
      'kitchen-cleaning',
      'bathroom-cleaning',
      'post-construction',
      'move-in-out',
      'window-cleaning',
      'disinfection',
      'specialized'
    ])
    .withMessage('Invalid service category'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('pricing.basePrice')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  body('duration.estimated')
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute')
];

// Admin only routes
router.post('/', protect, authorize('admin'), serviceValidation, handleValidationErrors, createService);
router.put('/:id', protect, authorize('admin'), serviceValidation, handleValidationErrors, updateService);
router.delete('/:id', protect, authorize('admin'), deleteService);

module.exports = router;