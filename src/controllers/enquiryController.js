const Enquiry = require('../models/Enquiry');
const { validationResult } = require('express-validator');

// @desc    Create new enquiry
// @route   POST /api/v1/enquiries
// @access  Public
const createEnquiry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const enquiryData = {
      ...req.body,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    const enquiry = await Enquiry.create(enquiryData);

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully. We will get back to you soon!',
      data: {
        id: enquiry._id,
        status: enquiry.status,
        createdAt: enquiry.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all enquiries
// @route   GET /api/v1/enquiries
// @access  Private (Admin only)
const getEnquiries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const enquiryType = req.query.type;
    const assignedTo = req.query.assignedTo;
    const search = req.query.search;

    // Build filter
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (enquiryType) {
      filter.enquiryType = enquiryType;
    }

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const enquiries = await Enquiry.find(filter)
      .populate('assignedTo', 'firstName lastName')
      .populate('response.respondedBy', 'firstName lastName')
      .populate('serviceId', 'serviceName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Enquiry.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: enquiries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single enquiry
// @route   GET /api/v1/enquiries/:id
// @access  Private (Admin only)
const getEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName')
      .populate('response.respondedBy', 'firstName lastName')
      .populate('serviceId', 'serviceName');

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    res.status(200).json({
      success: true,
      data: enquiry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update enquiry
// @route   PUT /api/v1/enquiries/:id
// @access  Private (Admin only)
const updateEnquiry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    const updateData = { ...req.body };

    // If responding to enquiry, add response details
    if (updateData.response && updateData.response.message) {
      updateData.response.respondedBy = req.user._id;
      updateData.response.respondedAt = new Date();
    }

    const updatedEnquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'firstName lastName')
     .populate('response.respondedBy', 'firstName lastName')
     .populate('serviceId', 'serviceName');

    res.status(200).json({
      success: true,
      data: updatedEnquiry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete enquiry
// @route   DELETE /api/v1/enquiries/:id
// @access  Private (Admin only)
const deleteEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    await Enquiry.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Enquiry deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get enquiry statistics
// @route   GET /api/v1/enquiries/stats
// @access  Private (Admin only)
const getEnquiryStats = async (req, res) => {
  try {
    const stats = await Enquiry.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalEnquiries = await Enquiry.countDocuments();
    const newEnquiries = await Enquiry.countDocuments({ status: 'new' });
    const resolvedEnquiries = await Enquiry.countDocuments({ status: 'resolved' });

    res.status(200).json({
      success: true,
      data: {
        total: totalEnquiries,
        new: newEnquiries,
        resolved: resolvedEnquiries,
        byStatus: stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  createEnquiry,
  getEnquiries,
  getEnquiry,
  updateEnquiry,
  deleteEnquiry,
  getEnquiryStats
};