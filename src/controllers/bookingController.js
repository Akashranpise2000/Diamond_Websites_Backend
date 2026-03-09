const BookingService = require('../services/bookingService');

// @desc    Create new booking
// @route   POST /api/v1/bookings
// @access  Public (allows anonymous bookings)
const createBooking = async (req, res) => {
  try {
    console.log('Create booking request body:', JSON.stringify(req.body, null, 2));
    const userId = req.user ? req.user._id : null; // Allow anonymous bookings
    const booking = await BookingService.createBooking(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user bookings
// @route   GET /api/v1/bookings
// @access  Private
const getBookings = async (req, res) => {
  try {
    const result = await BookingService.getBookings(req.user._id, req.user.role, req.query);

    res.status(200).json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
const getBooking = async (req, res) => {
  try {
    const booking = await BookingService.getBooking(req.params.id, req.user._id, req.user.role);

    res.status(200).json({
      success: true,
      message: 'Booking retrieved successfully',
      data: { booking }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || 'Booking not found',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update booking
// @route   PUT /api/v1/bookings/:id
// @access  Private
const updateBooking = async (req, res) => {
  try {
    const updatedBooking = await BookingService.updateBooking(req.params.id, req.body, req.user._id, req.user.role);

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: { booking: updatedBooking }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cancel booking
// @route   DELETE /api/v1/bookings/:id
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    await BookingService.cancelBooking(req.params.id, req.user._id, req.user.role, req.body.reason);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get upcoming bookings
// @route   GET /api/v1/bookings/upcoming
// @access  Private
const getUpcomingBookings = async (req, res) => {
  try {
    const bookings = await BookingService.getUpcomingBookings(req.user._id, req.user.role, req.query.hours);

    res.status(200).json({
      success: true,
      message: 'Upcoming bookings retrieved successfully',
      data: { bookings }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve upcoming bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  cancelBooking,
  getUpcomingBookings
};