const { connectDB } = require('../config/database');
const User = require('../models/User');
const Service = require('../models/Service');
const SystemSettings = require('../models/SystemSettings');
require('dotenv').config();

// Seed data
const seedData = {
  // Admin user
  admin: {
    firstName: 'Rahul',
    lastName: 'Nile',
    email: 'rahul.nile@gmail.com',
    phone: '9850781897',
    password: 'Admin@123',
    role: 'admin'
  },

  // Services
  services: [
    {
      serviceName: 'Regular House Cleaning',
      slug: 'regular-house-cleaning',
      category: 'regular-cleaning',
      description: 'Complete home cleaning service including dusting, vacuuming, mopping, and bathroom/kitchen cleaning.',
      shortDescription: 'Complete home cleaning service',
      features: ['Dusting all surfaces', 'Vacuuming carpets', 'Mopping floors', 'Bathroom deep clean', 'Kitchen cleaning'],
      inclusions: ['All rooms cleaning', 'Bathroom sanitization', 'Kitchen deep clean', 'Trash removal'],
      exclusions: ['Carpet shampooing', 'Window exterior cleaning', 'Appliance deep cleaning'],
      pricing: {
        basePrice: 999,
        pricingModel: 'area-based',
        areaRanges: [
          { minArea: 500, maxArea: 1000, price: 999 },
          { minArea: 1001, maxArea: 1500, price: 1299 },
          { minArea: 1501, maxArea: 2000, price: 1599 }
        ],
        unit: 'sqft'
      },
      duration: { estimated: 180, unit: 'minutes' },
      addOns: [
        { name: 'Eco-friendly products', price: 200, description: 'Use only eco-friendly cleaning products' },
        { name: 'Inside fridge cleaning', price: 300, description: 'Deep clean refrigerator interior' }
      ],
      availability: {
        serviceAreas: ['Mumbai', 'Thane', 'Navi Mumbai'],
        workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
        timeSlots: [
          { startTime: '09:00', endTime: '11:00' },
          { startTime: '11:00', endTime: '13:00' },
          { startTime: '14:00', endTime: '16:00' },
          { startTime: '16:00', endTime: '18:00' }
        ]
      },
      seo: {
        metaTitle: 'Regular House Cleaning Services | Diamond Clean',
        metaDescription: 'Professional regular house cleaning services in Mumbai. Book now for spotless home cleaning.',
        keywords: ['house cleaning', 'home cleaning', 'regular cleaning', 'Mumbai']
      },
      isActive: true,
      isFeatured: true
    },
    {
      serviceName: 'Deep Cleaning',
      slug: 'deep-cleaning',
      category: 'deep-cleaning',
      description: 'Thorough deep cleaning service for homes that need intensive cleaning of hard-to-reach areas.',
      shortDescription: 'Intensive deep cleaning service',
      features: ['Behind furniture cleaning', 'Baseboard cleaning', 'Light fixture cleaning', 'Vent cleaning', 'Appliance exterior cleaning'],
      inclusions: ['All regular cleaning', 'Behind furniture', 'Under beds/couches', 'Light fixtures', 'Air vents'],
      exclusions: ['Major repairs', 'Carpet cleaning', 'Window exterior'],
      pricing: {
        basePrice: 1499,
        pricingModel: 'area-based',
        areaRanges: [
          { minArea: 500, maxArea: 1000, price: 1499 },
          { minArea: 1001, maxArea: 1500, price: 1899 },
          { minArea: 1501, maxArea: 2000, price: 2299 }
        ],
        unit: 'sqft'
      },
      duration: { estimated: 300, unit: 'minutes' },
      addOns: [
        { name: 'Oven deep clean', price: 500, description: 'Complete oven interior cleaning' },
        { name: 'Wall washing', price: 400, description: 'Wash walls and remove marks' }
      ],
      availability: {
        serviceAreas: ['Mumbai', 'Thane', 'Navi Mumbai'],
        workingDays: [1, 2, 3, 4, 5, 6],
        timeSlots: [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '13:00', endTime: '16:00' }
        ]
      },
      seo: {
        metaTitle: 'Deep Cleaning Services | Professional Home Deep Clean',
        metaDescription: 'Expert deep cleaning services for thorough home cleaning. Remove dirt from hard-to-reach areas.',
        keywords: ['deep cleaning', 'intensive cleaning', 'thorough cleaning']
      },
      isActive: true,
      isFeatured: true
    },
    {
      serviceName: 'Office/Commercial Cleaning',
      slug: 'office-cleaning',
      category: 'office-cleaning',
      description: 'Professional commercial cleaning services for offices, shops, and business premises.',
      shortDescription: 'Commercial and office cleaning',
      features: ['Workstation cleaning', 'Common area cleaning', 'Restroom sanitization', 'Floor maintenance', 'Trash removal'],
      inclusions: ['All desks and chairs', 'Common areas', 'Restrooms', 'Kitchen areas', 'Trash removal'],
      exclusions: ['Major repairs', 'Window exterior', 'Specialized equipment'],
      pricing: {
        basePrice: 1999,
        pricingModel: 'area-based',
        areaRanges: [
          { minArea: 500, maxArea: 1000, price: 1999 },
          { minArea: 1001, maxArea: 2000, price: 2999 },
          { minArea: 2001, maxArea: 3000, price: 3999 }
        ],
        unit: 'sqft'
      },
      duration: { estimated: 240, unit: 'minutes' },
      addOns: [
        { name: 'Carpet shampooing', price: 800, description: 'Deep carpet cleaning' },
        { name: 'Glass facade cleaning', price: 600, description: 'Exterior glass cleaning' }
      ],
      availability: {
        serviceAreas: ['Mumbai', 'Thane', 'Navi Mumbai', 'Andheri', 'Bandra'],
        workingDays: [1, 2, 3, 4, 5], // Monday to Friday
        timeSlots: [
          { startTime: '18:00', endTime: '22:00' },
          { startTime: '20:00', endTime: '24:00' }
        ]
      },
      seo: {
        metaTitle: 'Office Cleaning Services | Commercial Cleaning Mumbai',
        metaDescription: 'Professional office and commercial cleaning services. Keep your workplace clean and hygienic.',
        keywords: ['office cleaning', 'commercial cleaning', 'business cleaning']
      },
      isActive: true,
      isFeatured: false
    }
  ]
};

// Seeding functions
const seedUsers = async () => {
  try {
    console.log('Seeding users...');

    // Create admin user
    const adminExists = await User.findOne({ email: seedData.admin.email });
    if (!adminExists) {
      await User.create(seedData.admin);
      console.log('✓ Admin user created');
    } else {
      console.log('✓ Admin user already exists');
    }
  } catch (error) {
    console.error('Error seeding users:', error);
  }
};

const seedServices = async () => {
  try {
    console.log('Seeding services...');

    for (const serviceData of seedData.services) {
      const serviceExists = await Service.findOne({ slug: serviceData.slug });
      if (!serviceExists) {
        // Get admin user as creator
        const adminUser = await User.findOne({ role: 'admin' });
        serviceData.createdBy = adminUser._id;

        await Service.create(serviceData);
        console.log(`✓ Service created: ${serviceData.serviceName}`);
      } else {
        console.log(`✓ Service already exists: ${serviceData.serviceName}`);
      }
    }
  } catch (error) {
    console.error('Error seeding services:', error);
  }
};

const seedSystemSettings = async () => {
  try {
    console.log('Seeding system settings...');
    await SystemSettings.initializeDefaults();
    console.log('✓ System settings initialized');
  } catch (error) {
    console.error('Error seeding system settings:', error);
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    await connectDB();

    await seedUsers();
    await seedServices();
    await seedSystemSettings();

    console.log('✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedUsers, seedServices, seedSystemSettings };