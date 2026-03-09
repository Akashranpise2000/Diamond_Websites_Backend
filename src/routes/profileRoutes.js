const express = require('express');
const { body } = require('express-validator');
const {
  getProfile,
  updateProfile
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

const router = express.Router();

// All profile routes require authentication
router.use(protect);

// Get current user profile
router.get('/', getProfile);

// Update current user profile
router.put('/', [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .custom((value) => {
      if (value && value.trim()) {
        return /^\+?[\d\s\-\(\)]{10,}$/.test(value.trim());
      }
      return true;
    })
    .withMessage('Please provide a valid phone number')
], handleValidationErrors, updateProfile);

module.exports = router;