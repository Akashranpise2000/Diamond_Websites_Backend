const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPayment,
  processRefund,
  getBookingPayments,
  getPaymentMethods,
  handleRazorpayWebhook
} = require('../controllers/paymentController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/methods', getPaymentMethods);

// Protected routes (Customer/Admin)
router.use(protect);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/:id', getPayment);
router.get('/booking/:bookingId', getBookingPayments);

// Admin only routes
router.post('/:id/refund', authorize('admin'), processRefund);

// Webhook route (no auth required, verified by signature)
router.post('/webhook/razorpay', handleRazorpayWebhook);

module.exports = router;