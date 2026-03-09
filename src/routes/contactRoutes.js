const express = require('express');
const { body, param } = require('express-validator');
const {
  submitContact,
  getContacts,
  getContact,
  updateContactStatus,
  deleteContact
} = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

const router = express.Router();

// Public route for contact submission
router.post('/', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .custom((value) => {
      if (value && value.trim()) {
        return /^\+?[\d\s\-\(\)]{10,}$/.test(value.trim());
      }
      return true;
    })
    .withMessage('Please provide a valid phone number'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters')
], handleValidationErrors, submitContact);

// All other routes require authentication
router.use(protect);

// Get all contacts (Admin only)
router.get('/', authorize('admin'), getContacts);

// Get single contact
router.get('/:id', [
  param('id')
    .isMongoId()
    .withMessage('Invalid contact ID')
], handleValidationErrors, getContact);

// Update contact status
router.put('/:id/status', [
  param('id')
    .isMongoId()
    .withMessage('Invalid contact ID'),
  body('status')
    .isIn(['pending', 'in_progress', 'resolved', 'closed'])
    .withMessage('Status must be pending, in_progress, resolved, or closed')
], handleValidationErrors, updateContactStatus);

// Delete contact (Admin only)
router.delete('/:id', authorize('admin'), [
  param('id')
    .isMongoId()
    .withMessage('Invalid contact ID')
], handleValidationErrors, deleteContact);

module.exports = router;