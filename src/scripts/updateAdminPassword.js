const { connectDB } = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const updateAdminPassword = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    const adminEmail = 'rahul.nile@gmail.com';
    const newPassword = 'Admin@123';

    console.log('Finding admin user...');
    const admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      console.log('Admin user not found');
      process.exit(1);
    }

    console.log('Hashing password...');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log('Updating admin password...');
    await User.findOneAndUpdate(
      { email: adminEmail },
      { password: hashedPassword },
      { new: true }
    );

    console.log('✅ Admin password updated successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', newPassword);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating admin password:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  updateAdminPassword();
}

module.exports = { updateAdminPassword };