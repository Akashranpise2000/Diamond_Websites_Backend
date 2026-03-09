const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const verifyAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/diamond-house-cleaning');
    console.log('Connected to MongoDB');

    // Find the admin user
    const user = await User.findOne({ email: 'rahul.nile@gmail.com' }).select('+password');

    if (!user) {
      console.log('Admin user not found');
      process.exit(1);
    }

    console.log('Admin user found:', user.email);
    console.log('Password hash exists:', !!user.password);
    console.log('Password hash starts with $2a$ (bcrypt):', user.password.startsWith('$2a$'));

    // Test password comparison
    const testPassword = 'Admin@123';
    const isValidPassword = await user.comparePassword(testPassword);

    console.log(`Password verification for '${testPassword}':`, isValidPassword ? 'SUCCESS' : 'FAILED');

    // Test with wrong password
    const wrongPassword = 'WrongPassword123';
    const isWrongPassword = await user.comparePassword(wrongPassword);

    console.log(`Password verification for '${wrongPassword}':`, isWrongPassword ? 'UNEXPECTED SUCCESS' : 'EXPECTED FAILURE');

    if (isValidPassword && !isWrongPassword) {
      console.log('✅ Password hashing and verification working correctly!');
    } else {
      console.log('❌ Password verification failed');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

verifyAdminPassword();