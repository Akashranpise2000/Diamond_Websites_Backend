const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const { logger } = require('../middleware/loggerMiddleware');

// Initialize Razorpay only if keys are available
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_KEY_ID !== 'your-razorpay-key-id' &&
    process.env.RAZORPAY_KEY_SECRET !== 'your-razorpay-key-secret') {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// @desc    Create payment order
// @route   POST /api/v1/payments/create-order
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;

    // Verify booking exists and belongs to user
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this booking'
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Booking must be confirmed before payment'
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ bookingId });
    if (existingPayment && existingPayment.status === 'success') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this booking'
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: `booking_${booking.bookingNumber}`,
      notes: {
        bookingId: bookingId,
        customerId: req.user._id.toString()
      }
    };

    const order = await razorpay.orders.create(options);

    // Save payment record
    const payment = await Payment.create({
      transactionId: order.id,
      bookingId,
      customerId: req.user._id,
      amount,
      currency: 'INR',
      paymentMethod: 'razorpay',
      gatewayOrderId: order.id,
      status: 'initiated'
    });

    logger.info(`Payment order created: ${order.id} for booking ${booking.bookingNumber}`);

    res.status(200).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentId: payment._id
      }
    });
  } catch (error) {
    logger.error('Create payment order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify payment
// @route   POST /api/v1/payments/verify
// @access  Private
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId
    } = req.body;

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { transactionId: razorpay_order_id },
      {
        gatewayTransactionId: razorpay_payment_id,
        status: 'success',
        paymentDetails: {
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature
        }
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Update booking status
    await Booking.findByIdAndUpdate(bookingId, {
      status: 'assigned',
      payment: {
        paymentId: payment._id,
        paymentStatus: 'completed',
        paymentMethod: 'razorpay'
      }
    });

    // TODO: Generate invoice
    // TODO: Send confirmation notifications

    logger.info(`Payment verified: ${razorpay_payment_id} for booking ${bookingId}`);

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: payment._id,
        transactionId: razorpay_payment_id
      }
    });
  } catch (error) {
    logger.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get payment details
// @route   GET /api/v1/payments/:id
// @access  Private
const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('bookingId', 'bookingNumber scheduledDate')
      .populate('customerId', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check permissions
    if (req.user.role === 'customer' && payment.customerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment details retrieved successfully',
      data: { payment }
    });
  } catch (error) {
    logger.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Process refund
// @route   POST /api/v1/payments/:id/refund
// @access  Private/Admin
const processRefund = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: 'Only successful payments can be refunded'
      });
    }

    // Process refund via Razorpay
    const refund = await razorpay.payments.refund(payment.gatewayTransactionId, {
      amount: amount * 100, // amount in paise
      notes: {
        reason: reason || 'Customer requested refund'
      }
    });

    // Update payment record
    payment.refund = {
      isRefunded: true,
      refundAmount: amount,
      refundTransactionId: refund.id,
      refundedAt: new Date(),
      refundReason: reason
    };
    payment.status = 'refunded';
    await payment.save();

    // Update booking status
    await Booking.findByIdAndUpdate(payment.bookingId, {
      status: 'refunded',
      cancellation: {
        isCancelled: true,
        cancelledAt: new Date(),
        refundAmount: amount
      }
    });

    logger.info(`Refund processed: ${refund.id} for payment ${payment._id}`);

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });
  } catch (error) {
    logger.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Refund processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get booking payments
// @route   GET /api/v1/payments/booking/:bookingId
// @access  Private
const getBookingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ bookingId: req.params.bookingId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Booking payments retrieved successfully',
      data: { payments }
    });
  } catch (error) {
    logger.error('Get booking payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve booking payments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get available payment methods
// @route   GET /api/v1/payments/methods
// @access  Public
const getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'upi',
        name: 'UPI',
        description: 'Pay using UPI apps like Google Pay, PhonePe, Paytm',
        icon: 'upi-icon',
        enabled: true
      },
      {
        id: 'card',
        name: 'Credit/Debit Card',
        description: 'Visa, Mastercard, RuPay cards accepted',
        icon: 'card-icon',
        enabled: true
      },
      {
        id: 'netbanking',
        name: 'Net Banking',
        description: 'Direct bank account transfer',
        icon: 'bank-icon',
        enabled: true
      },
      {
        id: 'wallet',
        name: 'Digital Wallets',
        description: 'Paytm, Mobikwik, Ola Money, etc.',
        icon: 'wallet-icon',
        enabled: true
      }
    ];

    res.status(200).json({
      success: true,
      message: 'Payment methods retrieved successfully',
      data: { paymentMethods }
    });
  } catch (error) {
    logger.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment methods',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Handle Razorpay webhook
// @route   POST /api/v1/payments/webhook/razorpay
// @access  Public (from Razorpay)
const handleRazorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload.payment.entity;

    logger.info(`Razorpay webhook received: ${event}`);

    switch (event) {
      case 'payment.captured':
        // Payment was successfully captured
        await Payment.findOneAndUpdate(
          { transactionId: paymentEntity.order_id },
          {
            status: 'success',
            gatewayTransactionId: paymentEntity.id
          }
        );
        break;

      case 'payment.failed':
        // Payment failed
        await Payment.findOneAndUpdate(
          { transactionId: paymentEntity.order_id },
          {
            status: 'failed'
          }
        );
        break;

      case 'refund.processed':
        // Refund was processed
        const refundEntity = req.body.payload.refund.entity;
        await Payment.findOneAndUpdate(
          { gatewayTransactionId: refundEntity.payment_id },
          {
            'refund.isRefunded': true,
            'refund.refundAmount': refundEntity.amount / 100,
            'refund.refundTransactionId': refundEntity.id,
            'refund.refundedAt': new Date()
          }
        );
        break;
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Razorpay webhook error:', error);
    res.status(500).send('Internal server error');
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPayment,
  processRefund,
  getBookingPayments,
  getPaymentMethods,
  handleRazorpayWebhook
};
