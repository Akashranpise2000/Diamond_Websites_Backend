const express = require('express');
const { body } = require('express-validator');
const {
  getCoupons,
  getCoupon,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon
} = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation rules
const couponValidation = [
  body('code')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Code must be between 3 and 20 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Description must be between 10 and 200 characters'),
  body('discountType')
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be percentage or fixed'),
  body('discountValue')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),
  body('minimumAmount')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Minimum amount must be a positive number'),
  body('maxDiscount')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Max discount must be a positive number'),
  body('usageLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Usage limit must be at least 1'),
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Valid expiry date required')
];

// Public routes
router.post('/validate', protect, validateCoupon);

// Admin only routes
router.use(protect);
router.use(authorize('admin'));

router.get('/', getCoupons);
router.get('/:id', getCoupon);
router.post('/', couponValidation, createCoupon);
router.put('/:id', couponValidation, updateCoupon);
router.delete('/:id', deleteCoupon);

module.exports = router;