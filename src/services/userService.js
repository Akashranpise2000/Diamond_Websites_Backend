const User = require('../models/User');
const { logger } = require('../middleware/loggerMiddleware');

class UserService {
  // Get user profile
  static async getProfile(userId) {
    const user = await User.findById(userId).select('-password');

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // Update user profile
  static async updateProfile(userId, updateData) {
    const { firstName, lastName, email, phone, profileImage } = updateData;

    // Prepare update object
    const updateFields = {};
    if (firstName !== undefined) updateFields.firstName = firstName;
    if (lastName !== undefined) updateFields.lastName = lastName;
    if (email !== undefined) updateFields.email = email;
    if (phone !== undefined && phone.trim() !== '') updateFields.phone = phone;
    if (profileImage !== undefined) updateFields.profileImage = profileImage;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    // Check if phone is already taken by another user
    if (phone && phone.trim() !== '') {
      const existingUser = await User.findOne({ phone, _id: { $ne: userId } });
      if (existingUser) {
        throw new Error('Phone number already in use');
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!updatedUser) {
      throw new Error('User not found');
    }

    logger.info(`User profile updated: ${updatedUser.email}`);

    return updatedUser;
  }

  // Get all users with pagination
  static async getUsers(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get single user
  static async getUser(userId) {
    const user = await User.findById(userId).select('-password');

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // Update user (admin)
  static async updateUser(userId, updateData, updatedBy) {
    const { firstName, lastName, email, phone, role, isActive } = updateData;

    // Prepare update object
    const updateFields = {};
    if (firstName !== undefined) updateFields.firstName = firstName;
    if (lastName !== undefined) updateFields.lastName = lastName;
    if (email !== undefined) updateFields.email = email;
    if (phone !== undefined && phone.trim() !== '') updateFields.phone = phone;
    if (role !== undefined) updateFields.role = role;
    if (isActive !== undefined) updateFields.isActive = isActive;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    // Check if phone is already taken by another user
    if (phone && phone.trim() !== '') {
      const existingUser = await User.findOne({ phone, _id: { $ne: userId } });
      if (existingUser) {
        throw new Error('Phone number already in use');
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!updatedUser) {
      throw new Error('User not found');
    }

    logger.info(`User updated by admin: ${updatedUser.email}`);

    return updatedUser;
  }

  // Delete user (admin)
  static async deleteUser(userId, deletedBy) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === deletedBy.toString()) {
      throw new Error('Cannot delete your own account');
    }

    await User.findByIdAndDelete(userId);

    logger.info(`User deleted by admin: ${user.email}`);

    return { message: 'User deleted successfully' };
  }

  // Add address to user
  static async addAddress(userId, addressData) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // If this is the default address, unset others
    if (addressData.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push(addressData);
    await user.save();

    return user.addresses[user.addresses.length - 1];
  }

  // Update user address
  static async updateAddress(userId, addressId, addressData) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      throw new Error('Address not found');
    }

    // If setting as default, unset others
    if (addressData.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    Object.assign(address, addressData);
    await user.save();

    return address;
  }

  // Delete user address
  static async deleteAddress(userId, addressId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    user.addresses.pull(addressId);
    await user.save();

    return { message: 'Address deleted successfully' };
  }

  // Get user loyalty points
  static async getLoyaltyPoints(userId) {
    const user = await User.findById(userId).select('loyaltyPoints');

    if (!user) {
      throw new Error('User not found');
    }

    return { points: user.loyaltyPoints };
  }

  // Update loyalty points
  static async updateLoyaltyPoints(userId, points) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { loyaltyPoints: points } },
      { new: true }
    ).select('loyaltyPoints');

    if (!user) {
      throw new Error('User not found');
    }

    return { points: user.loyaltyPoints };
  }
}

module.exports = UserService;