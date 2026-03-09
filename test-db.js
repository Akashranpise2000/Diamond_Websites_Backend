// Simple test script to verify database configuration
require('dotenv').config();
const { connectDB, disconnectDB, getConnectionStatus, getConnectionInfo, healthCheck } = require('./src/config/database');

async function testDatabase() {
  try {
    console.log('Testing database connection...');

    // Test connection
    await connectDB();
    console.log('✅ Database connected successfully');

    // Test connection status
    const status = getConnectionStatus();
    console.log('Connection status:', status ? 'Connected' : 'Disconnected');

    // Test connection info
    const info = getConnectionInfo();
    console.log('Connection info:', {
      isConnected: info.isConnected,
      readyState: info.readyState,
      database: info.database
    });

    // Test health check
    const health = await healthCheck();
    console.log('Health check:', health.status);

    // Disconnect
    await disconnectDB();
    console.log('✅ Database disconnected successfully');

    console.log('🎉 All database tests passed!');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  }
}

testDatabase();