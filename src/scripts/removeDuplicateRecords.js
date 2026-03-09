const mongoose = require('mongoose');
require('dotenv').config();

const removeDuplicateRecords = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/diamond-house-cleaning');

    const db = mongoose.connection.db;

    // Remove duplicates from blogposts by slug
    const blogpostsDuplicates = await db.collection('blogposts').aggregate([
      { $group: { _id: '$slug', count: { $sum: 1 }, docs: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    for (const dup of blogpostsDuplicates) {
      const idsToDelete = dup.docs.slice(1); // Keep the first, delete the rest
      await db.collection('blogposts').deleteMany({ _id: { $in: idsToDelete } });
      console.log(`Removed ${idsToDelete.length} duplicate blogposts for slug: ${dup._id}`);
    }

    // Remove duplicates from coupons by code
    const couponsDuplicates = await db.collection('coupons').aggregate([
      { $group: { _id: '$code', count: { $sum: 1 }, docs: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    for (const dup of couponsDuplicates) {
      const idsToDelete = dup.docs.slice(1);
      await db.collection('coupons').deleteMany({ _id: { $in: idsToDelete } });
      console.log(`Removed ${idsToDelete.length} duplicate coupons for code: ${dup._id}`);
    }

    console.log('Duplicate records removed successfully');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

removeDuplicateRecords();