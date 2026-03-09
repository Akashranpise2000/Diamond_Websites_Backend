const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getDashboardStats,
  getAllBookings,
  getBookingById,
  updateBookingById,
  deleteBookingById,
  getAllPayments,
  getPaymentById,
  getPaymentStats,
  getOrderStats
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// Bookings management
router.get('/bookings', getAllBookings);
router.get('/bookings/:id', getBookingById);
router.put('/bookings/:id', updateBookingById);
router.delete('/bookings/:id', deleteBookingById);

// Payments management
router.get('/payments', getAllPayments);
router.get('/payments/stats', getPaymentStats);
router.get('/payments/:id', getPaymentById);

// Orders/Bookings statistics
router.get('/orders/stats', getOrderStats);

module.exports = router;