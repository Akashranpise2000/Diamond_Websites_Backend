const mongoose = require('mongoose');
require('dotenv').config();

const dropDuplicateIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/diamond-house-cleaning');

    const db = mongoose.connection.db;

    // Drop duplicate indexes
    const collections = ['blogposts', 'coupons'];
    const indexesToDrop = {
      blogposts: 'slug_1',
      coupons: 'code_1'
    };

    for (const collection of collections) {
      try {
        await db.collection(collection).dropIndex(indexesToDrop[collection]);
        console.log(`Dropped duplicate index ${indexesToDrop[collection]} from ${collection}`);
      } catch (error) {
        if (error.code === 27) {
          console.log(`Index ${indexesToDrop[collection]} not found in ${collection}, skipping`);
        } else {
          console.error(`Error dropping index from ${collection}:`, error.message);
        }
      }
    }

    console.log('Duplicate indexes dropped successfully');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

dropDuplicateIndexes();