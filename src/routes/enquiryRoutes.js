const express = require('express');
const { body } = require('express-validator');
const {
  createEnquiry,
  getEnquiries,
  getEnquiry,
  updateEnquiry,
  deleteEnquiry,
  getEnquiryStats
} = require('../controllers/enquiryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation rules for enquiry creation
const enquiryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian phone number'),
  body('subject')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
  body('enquiryType')
    .optional()
    .isIn(['general', 'service', 'pricing', 'complaint', 'feedback', 'partnership'])
    .withMessage('Invalid enquiry type'),
  body('serviceId')
    .optional()
    .isMongoId()
    .withMessage('Invalid service ID'),
  body('source')
    .optional()
    .isIn(['website', 'email', 'phone', 'social_media', 'referral'])
    .withMessage('Invalid source')
];

// Public routes
router.post('/', enquiryValidation, createEnquiry);

// Protected routes (Admin only)
router.use(protect);
router.use(authorize('admin'));

router.get('/', getEnquiries);
router.get('/stats', getEnquiryStats);
router.get('/:id', getEnquiry);
router.put('/:id', updateEnquiry);
router.delete('/:id', deleteEnquiry);

module.exports = router;