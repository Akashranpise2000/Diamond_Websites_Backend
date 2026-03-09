/**
 * Super Admin Creation Script
 * 
 * This script creates a super admin user in the database.
 * Run with: node src/scripts/makeAdmin.js
 * 
 * IMPORTANT: Run this script ONCE to create the initial super admin account.
 * After the admin is created, remove or secure this script.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/diamond-house-cleaning');
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@diamondhousecleaning.com';
    const adminPassword = 'Admin@DH#2024!';
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('Super admin already exists:', adminEmail);
      console.log('Current role:', existingAdmin.role);
      
      // Update to admin role if not already
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('User updated to admin role');
      }
      
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create super admin user
    const superAdmin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: adminEmail,
      phone: '+919999999999',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true
    });

    console.log('Super admin created successfully!');
    console.log('Email:', adminEmail);
    console.log('Role:', superAdmin.role);
    console.log('ID:', superAdmin._id);

    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error.message);
    process.exit(1);
  }
};

createSuperAdmin();
