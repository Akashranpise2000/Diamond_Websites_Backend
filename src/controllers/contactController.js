const ContactService = require('../services/contactService');

// @desc    Submit new contact
// @route   POST /api/v1/contacts
// @access  Public (allows anonymous submissions)
const submitContact = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const contact = await ContactService.createContact(req.body, userId, req);

    res.status(201).json({
      success: true,
      message: 'Contact submitted successfully',
      data: { contact }
    });
  } catch (error) {
    console.error('Submit contact error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit contact',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all contacts (Admin only)
// @route   GET /api/v1/contacts
// @access  Private/Admin
const getContacts = async (req, res) => {
  try {
    const result = await ContactService.getContacts(req.query);

    res.status(200).json({
      success: true,
      message: 'Contacts retrieved successfully',
      data: result.contacts,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve contacts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single contact
// @route   GET /api/v1/contacts/:id
// @access  Private
const getContact = async (req, res) => {
  try {
    const contact = await ContactService.getContact(req.params.id, req.user._id, req.user.role);

    res.status(200).json({
      success: true,
      message: 'Contact retrieved successfully',
      data: { contact }
    });
  } catch (error) {
    console.error('Get contact error:', error);
    const statusCode = error.message === 'Not authorized to view this contact' ? 403 : 404;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Contact not found',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update contact status
// @route   PUT /api/v1/contacts/:id/status
// @access  Private
const updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required'
      });
    }

    const contact = await ContactService.updateContactStatus(
      req.params.id,
      status,
      req.user._id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Contact status updated successfully',
      data: { contact }
    });
  } catch (error) {
    console.error('Update contact status error:', error);
    const statusCode = error.message.includes('Not authorized') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update contact status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete contact (Admin only)
// @route   DELETE /api/v1/contacts/:id
// @access  Private/Admin
const deleteContact = async (req, res) => {
  try {
    const result = await ContactService.deleteContact(req.params.id, req.user.role);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    const statusCode = error.message.includes('Not authorized') ? 403 : 404;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete contact',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  submitContact,
  getContacts,
  getContact,
  updateContactStatus,
  deleteContact
};