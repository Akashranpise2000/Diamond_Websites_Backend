const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { logger } = require('../middleware/loggerMiddleware');

class BookingService {
  // Create new booking
  static async createBooking(userId, bookingData) {
    const {
      services,
      serviceAddress,
      scheduledDate,
      scheduledTimeSlot,
      specialInstructions,
      customFields
    } = bookingData;

    // Validate services exist and calculate pricing
    let subtotal = 0;
    const validatedServices = [];

    for (const serviceItem of services) {
      let service = null;

      // Try to find service in database
      try {
        if (typeof serviceItem.serviceId === 'string' && serviceItem.serviceId.match(/^[a-f\d]{24}$/i)) {
          // Valid ObjectId format
          service = await Service.findById(serviceItem.serviceId);
        } else {
          // Try direct lookup (will fail for non-ObjectId strings)
          service = await Service.findById(serviceItem.serviceId);
        }
      } catch (error) {
        // Service not found in database - will be handled below
        service = null;
      }

      // If service not found in database, check if it's mock data (for development)
      if (!service || !service.isActive) {
        // For development/demo purposes, allow mock service data
        if (serviceItem.serviceName && typeof serviceItem.serviceId === 'string' && serviceItem.serviceId.match(/^\d+$/)) {
          logger.warn(`Using mock service data for serviceId: ${serviceItem.serviceId}`);

          // Use the data provided from frontend (mock data)
          const basePrice = serviceItem.basePrice || 999;
          const addOnTotal = serviceItem.addOns?.reduce((sum, addOn) => sum + addOn.price, 0) || 0;
          const itemTotal = (basePrice + addOnTotal) * serviceItem.quantity;

          validatedServices.push({
            serviceId: serviceItem.serviceId, // Keep the mock ID
            serviceName: serviceItem.serviceName,
            quantity: serviceItem.quantity,
            basePrice,
            addOns: serviceItem.addOns || [],
            subtotal: itemTotal
          });

          subtotal += itemTotal;
          continue;
        } else {
          throw new Error(`Service ${serviceItem.serviceId} not found or inactive`);
        }
      }

      const basePrice = service.pricing.basePrice;
      const addOnTotal = serviceItem.addOns?.reduce((sum, addOn) => sum + addOn.price, 0) || 0;
      const itemTotal = (basePrice + addOnTotal) * serviceItem.quantity;

      validatedServices.push({
        serviceId: service._id,
        serviceName: service.serviceName,
        quantity: serviceItem.quantity,
        basePrice,
        addOns: serviceItem.addOns || [],
        subtotal: itemTotal
      });

      subtotal += itemTotal;
    }

    // Calculate tax (18% GST)
    const tax = Math.round(subtotal * 0.18 * 100) / 100;
    const total = subtotal + tax;

    // Generate booking number
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Booking.countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      }
    });
    const sequence = (count + 1).toString().padStart(4, '0');
    const bookingNumber = `DC${dateStr}${sequence}`;

    // Create booking
    const booking = await Booking.create({
      bookingNumber,
      customerId: userId,
      services: validatedServices,
      serviceAddress,
      scheduledDate,
      scheduledTimeSlot,
      pricing: {
        subtotal,
        tax,
        total
      },
      specialInstructions,
      customFields: customFields || {}
    });

    // Populate service details (only if customerId exists)
    if (userId) {
      await booking.populate('customerId', 'firstName lastName email phone');
    }

    logger.info(`Booking created: ${booking.bookingNumber} by user ${userId || 'anonymous'}`);

    return booking;
  }

  // Get user bookings
  static async getBookings(userId, userRole, queryParams = {}) {
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};

    if (userRole === 'customer') {
      filter.customerId = userId;
    }
    // Admin can see all bookings

    if (queryParams.status) {
      filter.status = queryParams.status;
    }

    if (queryParams.startDate && queryParams.endDate) {
      filter.scheduledDate = {
        $gte: new Date(queryParams.startDate),
        $lte: new Date(queryParams.endDate)
      };
    }

    const bookings = await Booking.find(filter)
      .populate('customerId', 'firstName lastName email phone')
      .populate('assignedStaff.staffId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(filter);

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get single booking
  static async getBooking(bookingId, userId, userRole) {
    const booking = await Booking.findById(bookingId)
      .populate('customerId', 'firstName lastName email phone addresses')
      .populate('assignedStaff.staffId', 'firstName lastName phone')
      .populate('payment');

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if user has permission to view this booking
    if (userRole === 'customer' && booking.customerId._id.toString() !== userId.toString()) {
      throw new Error('Not authorized to view this booking');
    }

    return booking;
  }

  // Update booking
  static async updateBooking(bookingId, updateData, userId, userRole) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check permissions
    if (userRole === 'customer' && booking.customerId.toString() !== userId.toString()) {
      throw new Error('Not authorized to update this booking');
    }

    // Only allow certain fields to be updated based on role and booking status
    const allowedFields = [];

    if (userRole === 'customer' && ['pending', 'confirmed'].includes(booking.status)) {
      allowedFields.push('scheduledDate', 'scheduledTimeSlot', 'specialInstructions', 'serviceAddress', 'customFields');
    }

    if (userRole === 'admin') {
      allowedFields.push('status', 'assignedStaff', 'completion', 'customFields');
    }

    const updateObj = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updateObj[key] = updateData[key];
      }
    });

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      updateObj,
      { new: true, runValidators: true }
    ).populate('customerId', 'firstName lastName email phone');

    logger.info(`Booking updated: ${updatedBooking.bookingNumber} by user ${userId}`);

    return updatedBooking;
  }

  // Cancel booking
  static async cancelBooking(bookingId, userId, userRole, reason) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check permissions
    if (userRole === 'customer' && booking.customerId.toString() !== userId.toString()) {
      throw new Error('Not authorized to cancel this booking');
    }

    // Check if booking can be cancelled
    if (!booking.canCancel()) {
      throw new Error('Booking cannot be cancelled at this time');
    }

    // Update booking status
    booking.status = 'cancelled';
    booking.cancellation = {
      isCancelled: true,
      cancelledBy: userId,
      cancelledAt: new Date(),
      cancellationReason: reason || 'Cancelled by user'
    };

    await booking.save();

    // TODO: Process refund if payment was made

    logger.info(`Booking cancelled: ${booking.bookingNumber} by user ${userId}`);

    return { message: 'Booking cancelled successfully' };
  }

  // Get upcoming bookings
  static async getUpcomingBookings(userId, userRole, hours = 24) {
    const futureDate = new Date(Date.now() + hours * 60 * 60 * 1000);

    let filter = {
      scheduledDate: { $lte: futureDate },
      status: { $in: ['confirmed', 'assigned'] }
    };

    if (userRole === 'customer') {
      filter.customerId = userId;
    }

    const bookings = await Booking.find(filter)
      .populate('customerId', 'firstName lastName phone')
      .sort({ scheduledDate: 1 });

    return bookings;
  }

  // Get booking statistics
  static async getBookingStats(startDate, endDate) {
    const stats = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' }
        }
      }
    ]);

    return stats;
  }
}

module.exports = BookingService;