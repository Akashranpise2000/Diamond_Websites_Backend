const express = require('express');
const { body } = require('express-validator');
const {
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  cancelBooking,
  getUpcomingBookings
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

const router = express.Router();

// Validation rules
const bookingValidation = [
  body('services')
    .isArray({ min: 1 })
    .withMessage('At least one service is required'),
  body('services.*.serviceId')
    .custom((value) => {
      // Allow MongoDB ObjectIds or string IDs for mock data
      if (typeof value === 'string' && value.match(/^[a-f\d]{24}$/i)) {
        return true; // Valid ObjectId
      }
      if (typeof value === 'string' && value.match(/^\d+$/)) {
        return true; // Mock data ID (numeric string)
      }
      return false;
    })
    .withMessage('Valid service ID is required'),
  body('services.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('serviceAddress.street')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Street address is required'),
  body('serviceAddress.city')
    .trim()
    .isLength({ min: 1 })
    .withMessage('City is required'),
  body('serviceAddress.state')
    .trim()
    .isLength({ min: 1 })
    .withMessage('State is required'),
  body('serviceAddress.zipCode')
    .matches(/^\d{5,6}$/)
    .withMessage('Valid 5-6 digit zip code is required'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Valid scheduled date is required'),
  body('scheduledTimeSlot')
    .isIn(['9:00 AM - 11:00 AM', '11:00 AM - 1:00 PM', '2:00 PM - 4:00 PM', '4:00 PM - 6:00 PM'])
    .withMessage('Valid time slot is required'),
  body('customFields')
    .optional()
    .isObject()
    .withMessage('Custom fields must be an object')
];

// Public route for creating bookings (anonymous booking allowed)
router.post('/', bookingValidation, handleValidationErrors, createBooking);

// All other routes require authentication
router.use(protect);
router.get('/', getBookings);
router.get('/upcoming', getUpcomingBookings);
router.get('/:id', getBooking);
router.put('/:id', updateBooking);
router.delete('/:id', cancelBooking);

module.exports = router;