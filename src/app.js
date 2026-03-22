const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const contactRoutes = require('./routes/contactRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const blogRoutes = require('./routes/blogRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const couponRoutes = require('./routes/couponRoutes');
const systemSettingsRoutes = require('./routes/systemSettingsRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import comprehensive middleware
const errorMiddleware = require('./middleware/errorMiddleware');
const { morganMiddleware, customLogger } = require('./middleware/loggerMiddleware');
const { requestId, requestLogger } = require('./middleware/requestIdMiddleware');
const { checkMaintenanceMode } = require('./middleware/maintenanceMiddleware');
const { apiVersioning, requireVersioning } = require('./middleware/apiVersioningMiddleware');
const {
  generalLimiter,
  authLimiter,
  userActionLimiter,
  readLimiter,
  sensitiveOperationLimiter,
  uploadLimiter,
  createAccountLimiter,
  bookingLimiter
} = require('./middleware/rateLimitMiddleware');
const {
  mongoSanitizeMiddleware,
  xssMiddleware,
  hppMiddleware,
  securityHeaders,
  requestSizeLimiter,
  sqlInjectionProtection
} = require('./middleware/securityMiddleware');
const { sanitizeInput } = require('./middleware/validationMiddleware');
const { protect, authorize } = require('./middleware/authMiddleware');

const app = express();

// ===== COMPREHENSIVE MIDDLEWARE STACK =====

// 1. Request ID and logging (must be first)
app.use(requestId);
app.use(requestLogger);

// 2. Security headers (must be early)
app.use(securityHeaders);

// 3. CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // Also allow localhost for development
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.CLIENT_URL,
      // Add common production URLs
      process.env.FRONTEND_URL,
      'https://diamond-house-cleaning.onrender.com',
      'https://diamond-house-cleaning-frontend.onrender.com'
    ].filter(Boolean);
    
    // In production, allow if origin matches or no origin (postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // For production, allow all origins to avoid CORS issues
      // In production, you should configure this properly
      if (process.env.NODE_ENV === 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Version', 'X-Request-ID']
};
app.use(cors(corsOptions));

// 4. Helmet security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // We'll set this manually in securityHeaders
}));

// 5. Maintenance mode check
app.use(checkMaintenanceMode);

// 6. API versioning (for API routes)
app.use('/api', apiVersioning);
app.use('/api', requireVersioning);

// 7. Rate limiting (different limits for different routes)
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/auth/register', createAccountLimiter);
app.use('/api/v1/bookings', bookingLimiter);
app.use('/api/v1/users', userActionLimiter);
app.use('/api/v1/services', readLimiter);
app.use('/api/v1/blog', readLimiter);
app.use('/api/v1/gallery', readLimiter);
app.use('/api/v1/reviews', userActionLimiter);
app.use('/api/v1/notifications', userActionLimiter);
app.use('/api/v1/coupons/validate', userActionLimiter);
app.use('/api/v1/enquiries', userActionLimiter);
app.use('/uploads', uploadLimiter);
app.use('/api/v1', generalLimiter); // Catch-all for other API routes

// 8. Input sanitization and security
app.use(mongoSanitizeMiddleware); // Re-enabled with alternative query checking
app.use(xssMiddleware); // Re-enabled with alternative query checking
app.use(hppMiddleware);
app.use(sqlInjectionProtection);
app.use(sanitizeInput);

// 9. Request size limiting
app.use(requestSizeLimiter);

// 10. Body parsing middleware
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification
    if (req.url.includes('/webhook')) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// 11. Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 12. Legacy logging (for backward compatibility)
app.use(morganMiddleware);
app.use(customLogger);

// API routes
app.get('/', (req, res) => {
  res.send('API is running...');
});

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users/profile', profileRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/blog', blogRoutes);
app.use('/api/v1/gallery', galleryRoutes);
app.use('/api/v1/enquiries', enquiryRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/system-settings', systemSettingsRoutes);
app.use('/api/v1/admin', adminRoutes);

// Maintenance mode toggle endpoint (admin only)
const { toggleMaintenanceMode } = require('./middleware/maintenanceMiddleware');

app.post('/api/v1/admin/maintenance',
  protect,
  authorize('admin'),
  toggleMaintenanceMode
);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    apiVersion: req.apiVersion || 'v1',
    requestId: req.id
  });
});

// System status endpoint (admin only)
app.get('/api/v1/system/status', protect, authorize('admin'), async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const os = require('os');

    res.status(200).json({
      success: true,
      data: {
        server: {
          uptime: process.uptime(),
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          memory: process.memoryUsage(),
          cpu: os.cpus().length
        },
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          name: mongoose.connection.name,
          host: mongoose.connection.host
        },
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get system status',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handling middleware
app.use(errorMiddleware);

module.exports = app;