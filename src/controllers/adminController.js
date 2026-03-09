const User = require('../models/User');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Payment = require('../models/Payment');
const { logger } = require('../middleware/loggerMiddleware');

// @desc    Get dashboard stats
// @route   GET /api/v1/admin/dashboard/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    // Get total counts
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalBookings = await Booking.countDocuments();
    const activeServices = await Service.countDocuments({ isActive: true });

    // Get total revenue (sum of all booking prices)
    const revenueResult = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Get monthly bookings for the last 12 months
    const monthlyBookings = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get revenue by service
    const revenueByService = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$services' },
      {
        $lookup: {
          from: 'services',
          localField: 'services.serviceId',
          foreignField: '_id',
          as: 'serviceInfo'
        }
      },
      { $unwind: { path: '$serviceInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$serviceInfo.name', '$services.serviceName'] },
          revenue: { $sum: '$services.subtotal' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    // Get recent activity (last 10 bookings)
    const recentActivity = await Booking.find()
      .populate('customerId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('status pricing.total createdAt customerId services.serviceName');

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        totalRevenue,
        activeServices,
        totalCustomers,
        monthlyBookings: monthlyBookings.map(item => ({
          month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          count: item.count
        })),
        revenueByService,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all bookings (admin view)
// @route   GET /api/v1/admin/bookings
// @access  Private/Admin
const getAllBookings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search,
      startDate,
      endDate,
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search by booking number or customer name/email
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { bookingNumber: searchRegex },
        { 'customerId.firstName': searchRegex },
        { 'customerId.lastName': searchRegex },
        { 'customerId.email': searchRegex }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const bookings = await Booking.find(query)
      .populate('customerId', 'firstName lastName email phone')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single booking (admin view)
// @route   GET /api/v1/admin/bookings/:id
// @access  Private/Admin
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customerId', 'firstName lastName email phone')
      .populate('assignedStaff', 'firstName lastName phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Get associated payments
    const payments = await Payment.find({ bookingId: booking._id })
      .populate('customerId', 'firstName lastName email');

    res.status(200).json({
      success: true,
      data: {
        booking,
        payments
      }
    });
  } catch (error) {
    logger.error('Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update booking (admin)
// @route   PUT /api/v1/admin/bookings/:id
// @access  Private/Admin
const updateBookingById = async (req, res) => {
  try {
    const { status, notes, assignedStaff, scheduledDate, scheduledTimeSlot } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update fields
    if (status) booking.status = status;
    if (notes) booking.notes = notes;
    if (assignedStaff) booking.assignedStaff = assignedStaff;
    if (scheduledDate) booking.scheduledDate = scheduledDate;
    if (scheduledTimeSlot) booking.scheduledTimeSlot = scheduledTimeSlot;

    await booking.save();

    logger.info(`Admin updated booking ${booking.bookingNumber}: ${JSON.stringify(req.body)}`);

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: { booking }
    });
  } catch (error) {
    logger.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete/Cancel booking (admin)
// @route   DELETE /api/v1/admin/bookings/:id
// @access  Private/Admin
const deleteBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be cancelled
    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a completed booking'
      });
    }

    booking.status = 'cancelled';
    booking.cancellation = {
      isCancelled: true,
      cancelledAt: new Date(),
      cancellationReason: req.body.reason || 'Cancelled by admin'
    };
    await booking.save();

    logger.info(`Admin cancelled booking ${booking.bookingNumber}`);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    logger.error('Delete booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all payments (admin view)
// @route   GET /api/v1/admin/payments
// @access  Private/Admin
const getAllPayments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status,
      search,
      startDate,
      endDate,
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { transactionId: searchRegex },
        { 'customerId.firstName': searchRegex },
        { 'customerId.lastName': searchRegex },
        { 'customerId.email': searchRegex }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const payments = await Payment.find(query)
      .populate('bookingId', 'bookingNumber scheduledDate pricing')
      .populate('customerId', 'firstName lastName email phone')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    // Get payment stats
    const stats = await Payment.aggregate([
      { $match: { status: 'success' } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        stats: stats[0] || { totalAmount: 0, count: 0, avgAmount: 0 }
      }
    });
  } catch (error) {
    logger.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get payment by ID (admin view)
// @route   GET /api/v1/admin/payments/:id
// @access  Private/Admin
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('bookingId')
      .populate('customerId', 'firstName lastName email phone');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    logger.error('Get payment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get payment statistics
// @route   GET /api/v1/admin/payments/stats
// @access  Private/Admin
const getPaymentStats = async (req, res) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    let dateFilter = {};
    const now = new Date();

    if (startDate && endDate) {
      dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      switch (period) {
        case 'day':
          dateFilter = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
          break;
        case 'week':
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
          break;
        case 'month':
          dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
          break;
        case 'year':
          dateFilter = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
          break;
        default:
          dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
      }
    }

    // Overall stats
    const overallStats = await Payment.aggregate([
      { $match: { status: 'success' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          avgTransaction: { $avg: '$amount' }
        }
      }
    ]);

    // Period stats
    const periodStats = await Payment.aggregate([
      { $match: { status: 'success', createdAt: dateFilter } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Status breakdown
    const statusBreakdown = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    // Payment method breakdown
    const methodBreakdown = await Payment.aggregate([
      { $match: { status: 'success' } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    // Daily/weekly revenue trend
    const revenueTrend = await Payment.aggregate([
      { $match: { status: 'success', createdAt: dateFilter } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: 30 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overall: overallStats[0] || { totalRevenue: 0, totalTransactions: 0, avgTransaction: 0 },
        period: periodStats[0] || { revenue: 0, count: 0 },
        statusBreakdown,
        methodBreakdown,
        revenueTrend
      }
    });
  } catch (error) {
    logger.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get booking/order statistics
// @route   GET /api/v1/admin/orders/stats
// @access  Private/Admin
const getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    let dateFilter = {};
    const now = new Date();

    if (startDate && endDate) {
      dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      switch (period) {
        case 'day':
          dateFilter = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
          break;
        case 'week':
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
          break;
        case 'month':
          dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
          break;
        case 'year':
          dateFilter = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
          break;
        default:
          dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
      }
    }

    // Overall stats
    const overallStats = await Booking.aggregate([
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          avgOrderValue: { $avg: '$pricing.total' }
        }
      }
    ]);

    // Status breakdown
    const statusBreakdown = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Period stats
    const periodStats = await Booking.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      }
    ]);

    // Service popularity
    const servicePopularity = await Booking.aggregate([
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services.serviceName',
          count: { $sum: 1 },
          revenue: { $sum: '$services.subtotal' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Daily/weekly trend
    const orderTrend = await Booking.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: 30 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overall: overallStats[0] || { totalBookings: 0, totalRevenue: 0, avgOrderValue: 0 },
        period: periodStats[0] || { bookings: 0, revenue: 0 },
        statusBreakdown,
        servicePopularity,
        orderTrend
      }
    });
  } catch (error) {
    logger.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllBookings,
  getBookingById,
  updateBookingById,
  deleteBookingById,
  getAllPayments,
  getPaymentById,
  getPaymentStats,
  getOrderStats
};