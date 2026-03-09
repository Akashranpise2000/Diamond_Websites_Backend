const Service = require('../models/Service');
const { logger } = require('../middleware/loggerMiddleware');

// @desc    Get all services
// @route   GET /api/v1/services
// @access  Public
const getServices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = { isActive: true };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.search) {
      filter.$or = [
        { serviceName: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { features: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Build sort object
    let sort = {};
    if (req.query.sort) {
      const sortBy = req.query.sort.startsWith('-') ? req.query.sort.substring(1) : req.query.sort;
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      sort[sortBy] = sortOrder;
    } else {
      sort.popularity = -1; // Default sort by popularity
    }

    const services = await Service.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await Service.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Services retrieved successfully',
      data: {
        services,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single service
// @route   GET /api/v1/services/:id
// @access  Public
const getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Increment popularity
    service.popularity += 1;
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service retrieved successfully',
      data: { service }
    });
  } catch (error) {
    logger.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get service by slug
// @route   GET /api/v1/services/slug/:slug
// @access  Public
const getServiceBySlug = async (req, res) => {
  try {
    const service = await Service.findOne({
      slug: req.params.slug,
      isActive: true
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Increment popularity
    service.popularity += 1;
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service retrieved successfully',
      data: { service }
    });
  } catch (error) {
    logger.error('Get service by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get services by category
// @route   GET /api/v1/services/category/:category
// @access  Public
const getServicesByCategory = async (req, res) => {
  try {
    const services = await Service.find({
      category: req.params.category,
      isActive: true
    }).sort({ popularity: -1 });

    res.status(200).json({
      success: true,
      message: 'Services retrieved successfully',
      data: { services }
    });
  } catch (error) {
    logger.error('Get services by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get featured services
// @route   GET /api/v1/services/featured
// @access  Public
const getFeaturedServices = async (req, res) => {
  try {
    const services = await Service.find({
      isFeatured: true,
      isActive: true
    }).sort({ popularity: -1 }).limit(6);

    res.status(200).json({
      success: true,
      message: 'Featured services retrieved successfully',
      data: { services }
    });
  } catch (error) {
    logger.error('Get featured services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve featured services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Search services
// @route   GET /api/v1/services/search
// @access  Public
const searchServices = async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const services = await Service.find({
      isActive: true,
      $or: [
        { serviceName: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { features: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ]
    }).sort({ popularity: -1 }).limit(20);

    res.status(200).json({
      success: true,
      message: 'Search results retrieved successfully',
      data: { services }
    });
  } catch (error) {
    logger.error('Search services error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create service
// @route   POST /api/v1/services
// @access  Private/Admin
const createService = async (req, res) => {
  try {
    const serviceData = {
      ...req.body,
      createdBy: req.user._id
    };

    const service = await Service.create(serviceData);

    logger.info(`Service created: ${service.serviceName} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service }
    });
  } catch (error) {
    logger.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update service
// @route   PUT /api/v1/services/:id
// @access  Private/Admin
const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    logger.info(`Service updated: ${updatedService.serviceName} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: { service: updatedService }
    });
  } catch (error) {
    logger.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete service
// @route   DELETE /api/v1/services/:id
// @access  Private/Admin
const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    await Service.findByIdAndDelete(req.params.id);

    logger.info(`Service deleted: ${service.serviceName} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    logger.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getServices,
  getService,
  getServiceBySlug,
  getServicesByCategory,
  getFeaturedServices,
  searchServices,
  createService,
  updateService,
  deleteService
};