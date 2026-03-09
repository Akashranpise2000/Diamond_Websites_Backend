const Contact = require('../models/Contact');

class ContactService {
  // Create new contact
  static async createContact(contactData, userId = null, req = null) {
    const {
      name,
      email,
      phone,
      message
    } = contactData;

    const contact = await Contact.create({
      name,
      email,
      phone,
      message,
      submittedBy: userId,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent')
    });

    return contact;
  }

  // Get contacts for admin
  static async getContacts(queryParams = {}) {
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};

    if (queryParams.status) {
      filter.status = queryParams.status;
    }

    if (queryParams.startDate && queryParams.endDate) {
      filter.createdAt = {
        $gte: new Date(queryParams.startDate),
        $lte: new Date(queryParams.endDate)
      };
    }

    if (queryParams.search) {
      filter.$or = [
        { name: { $regex: queryParams.search, $options: 'i' } },
        { email: { $regex: queryParams.search, $options: 'i' } },
        { message: { $regex: queryParams.search, $options: 'i' } }
      ];
    }

    const contacts = await Contact.find(filter)
      .populate('submittedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Contact.countDocuments(filter);

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get single contact
  static async getContact(contactId, userId, userRole) {
    const contact = await Contact.findById(contactId)
      .populate('submittedBy', 'firstName lastName email phone');

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Check if user has permission to view this contact
    if (userRole === 'customer' && contact.submittedBy?._id.toString() !== userId?.toString()) {
      throw new Error('Not authorized to view this contact');
    }

    return contact;
  }

  // Update contact status
  static async updateContactStatus(contactId, status, userId, userRole) {
    const contact = await Contact.findById(contactId);

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Check permissions
    if (!contact.canUpdate(userRole, userId)) {
      throw new Error('Not authorized to update this contact');
    }

    contact.status = status;
    await contact.save();

    return contact;
  }

  // Delete contact (admin only)
  static async deleteContact(contactId, userRole) {
    if (userRole !== 'admin') {
      throw new Error('Not authorized to delete contacts');
    }

    const contact = await Contact.findById(contactId);

    if (!contact) {
      throw new Error('Contact not found');
    }

    await Contact.findByIdAndDelete(contactId);

    return { message: 'Contact deleted successfully' };
  }

  // Get contact statistics
  static async getContactStats(startDate, endDate) {
    const stats = await Contact.aggregate([
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
          count: { $sum: 1 }
        }
      }
    ]);

    return stats;
  }
}

module.exports = ContactService;