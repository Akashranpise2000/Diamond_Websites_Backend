// Healthcheck endpoint for Render and Docker
const mongoose = require('mongoose');

const healthcheck = async () => {
  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      console.log('Healthcheck: Database OK');
      process.exit(0);
    } else {
      console.error('Healthcheck: Database not connected');
      process.exit(1);
    }
  } catch (error) {
    console.error('Healthcheck failed:', error.message);
    process.exit(1);
  }
};

// Run healthcheck if called directly
if (require.main === module) {
  healthcheck();
}

module.exports = healthcheck;
