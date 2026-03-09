const { body, param, query, validationResult } = require('express-validator');
const { logger } = require('./loggerMiddleware');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      errors: errors.array(),
      url: req.url,
      method: req.method,
      ip: req.ip,
      userId: req.user ? req.user._id : null
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Sanitize input data
const sanitizeInput = (req, res, next) => {
  // Recursively sanitize object properties
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS vectors
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    sanitizeObject(req.params);
  }

  next();
};

// Common validation rules
const commonValidations = {
  // MongoDB ObjectId validation
  objectId: (field) => param(field).isMongoId().withMessage(`Invalid ${field} ID`),

  // Email validation
  email: (field = 'email') => body(field)
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  // Phone validation (Indian format)
  phone: (field = 'phone') => body(field)
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian phone number'),

  // Password validation
  password: (field = 'password') => body(field)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  // Required string validation
  requiredString: (field, min = 1, max = 255) => body(field)
    .trim()
    .isLength({ min, max })
    .withMessage(`${field} must be between ${min} and ${max} characters`),

  // Optional string validation
  optionalString: (field, max = 255) => body(field)
    .optional()
    .trim()
    .isLength({ max })
    .withMessage(`${field} cannot exceed ${max} characters`),

  // Numeric validation
  number: (field, min = 0) => body(field)
    .isNumeric()
    .isFloat({ min })
    .withMessage(`${field} must be a number greater than or equal to ${min}`),

  // Boolean validation
  boolean: (field) => body(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} must be a boolean`),

  // Date validation
  date: (field) => body(field)
    .optional()
    .isISO8601()
    .withMessage(`Please provide a valid date for ${field}`),

  // URL validation
  url: (field) => body(field)
    .optional()
    .isURL()
    .withMessage(`Please provide a valid URL for ${field}`),

  // Array validation
  array: (field, min = 0, max = 100) => body(field)
    .optional()
    .isArray({ min, max })
    .withMessage(`${field} must be an array with ${min}-${max} items`),

  // Enum validation
  enum: (field, values) => body(field)
    .optional()
    .isIn(values)
    .withMessage(`${field} must be one of: ${values.join(', ')}`)
};

// Predefined validation chains for common operations
const validationChains = {
  // User registration
  userRegistration: [
    commonValidations.requiredString('firstName', 2, 50),
    commonValidations.requiredString('lastName', 2, 50),
    commonValidations.email(),
    commonValidations.phone(),
    commonValidations.password()
  ],

  // User login
  userLogin: [
    body('identifier')
      .notEmpty()
      .withMessage('Email or phone number is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Profile update
  profileUpdate: [
    commonValidations.optionalString('firstName', 50),
    commonValidations.optionalString('lastName', 50),
    commonValidations.email(),
    commonValidations.phone()
  ],

  // Service creation/update
  service: [
    commonValidations.requiredString('serviceName', 2, 100),
    commonValidations.requiredString('description', 10, 1000),
    commonValidations.enum('category', [
      'regular-cleaning', 'deep-cleaning', 'office-cleaning',
      'carpet-cleaning', 'upholstery-cleaning', 'kitchen-cleaning',
      'bathroom-cleaning', 'post-construction', 'move-in-out',
      'window-cleaning', 'disinfection', 'specialized'
    ]),
    commonValidations.number('basePrice'),
    commonValidations.number('duration', 1)
  ],

  // Booking creation
  booking: [
    body('services')
      .isArray({ min: 1 })
      .withMessage('At least one service is required'),
    body('services.*.serviceId')
      .isMongoId()
      .withMessage('Valid service ID is required'),
    body('services.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1'),
    commonValidations.requiredString('serviceAddress.addressLine1', 5, 200),
    commonValidations.optionalString('serviceAddress.addressLine2', 200),
    commonValidations.requiredString('serviceAddress.city', 2, 100),
    commonValidations.requiredString('serviceAddress.state', 2, 100),
    body('serviceAddress.pincode')
      .matches(/^\d{6}$/)
      .withMessage('Valid 6-digit pincode is required'),
    commonValidations.date('scheduledDate'),
    body('scheduledTimeSlot.startTime')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Valid start time is required'),
    body('scheduledTimeSlot.endTime')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Valid end time is required')
  ],

  // Blog post
  blogPost: [
    commonValidations.requiredString('title', 5, 200),
    commonValidations.requiredString('content', 50),
    commonValidations.optionalString('excerpt', 300),
    commonValidations.enum('category', [
      'cleaning-tips', 'industry-news', 'company-updates', 'how-to-guides'
    ]),
    commonValidations.optionalString('status', 20)
  ],

  // Enquiry/Contact
  enquiry: [
    commonValidations.requiredString('name', 2, 100),
    commonValidations.email(),
    commonValidations.phone(),
    commonValidations.requiredString('subject', 5, 200),
    commonValidations.requiredString('message', 10, 1000),
    commonValidations.enum('enquiryType', [
      'general', 'service', 'pricing', 'complaint', 'feedback', 'partnership'
    ])
  ],

  // Review
  review: [
    body('bookingId')
      .isMongoId()
      .withMessage('Valid booking ID is required'),
    body('serviceId')
      .isMongoId()
      .withMessage('Valid service ID is required'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    commonValidations.optionalString('title', 100),
    commonValidations.requiredString('comment', 10, 500)
  ]
};

module.exports = {
  handleValidationErrors,
  sanitizeInput,
  commonValidations,
  validationChains
};