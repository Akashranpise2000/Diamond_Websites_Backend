const mongoose = require('mongoose');

/**
 * Database configuration and connection management
 * Handles MongoDB connection using Mongoose with proper error handling and logging
 */

// Database connection options
const connectionOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds (increased for Atlas)
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferCommands: false, // Disable mongoose buffering
  // Atlas-specific options
  // The appName is passed in the connection string as a query parameter
  // Additional retry settings for better Atlas compatibility
  retryWrites: true,
  retryReads: true,
};

// Connection state
let isConnected = false;

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    // Get MongoDB URI from environment variables
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/diamond-house-cleaning';

    // Validate connection string
    if (!mongoURI) {
      throw new Error('MongoDB connection string is required. Please set MONGODB_URI environment variable.');
    }

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoURI, connectionOptions);

    isConnected = true;

    // Log successful connection
    if (global.logger) {
      global.logger.info(`Connected to MongoDB: ${conn.connection.host}`, {
        database: conn.connection.name,
        host: conn.connection.host,
        port: conn.connection.port
      });
    } else {
      console.log(`Connected to MongoDB: ${conn.connection.host}`);
    }

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      isConnected = false;
      if (global.logger) {
        global.logger.error('MongoDB connection error:', error);
      } else {
        console.error('MongoDB connection error:', error);
      }
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      if (global.logger) {
        global.logger.warn('MongoDB disconnected');
      } else {
        console.warn('MongoDB disconnected');
      }
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      if (global.logger) {
        global.logger.info('MongoDB reconnected');
      } else {
        console.log('MongoDB reconnected');
      }
    });

  } catch (error) {
    isConnected = false;

    if (global.logger) {
      global.logger.error('Failed to connect to MongoDB:', error);
    } else {
      console.error('Failed to connect to MongoDB:', error);
    }

    // Don't exit process here - let the calling code handle it
    throw error;
  }
};

/**
 * Disconnect from MongoDB database
 * @param {boolean} force - Force close the connection
 * @returns {Promise<void>}
 */
const disconnectDB = async (force = false) => {
  try {
    await mongoose.connection.close(force);
    isConnected = false;

    if (global.logger) {
      global.logger.info('MongoDB connection closed');
    } else {
      console.log('MongoDB connection closed');
    }
  } catch (error) {
    if (global.logger) {
      global.logger.error('Error closing MongoDB connection:', error);
    } else {
      console.error('Error closing MongoDB connection:', error);
    }
    throw error;
  }
};

/**
 * Get database connection status
 * @returns {boolean} - True if connected, false otherwise
 */
const getConnectionStatus = () => {
  return isConnected && mongoose.connection.readyState === 1;
};

/**
 * Get database connection information
 * @returns {object} - Connection information
 */
const getConnectionInfo = () => {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    name: mongoose.connection.name,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    database: mongoose.connection.db ? mongoose.connection.db.databaseName : null
  };
};

/**
 * Health check for database connection
 * @returns {Promise<object>} - Health check result
 */
const healthCheck = async () => {
  try {
    // Ping the database
    await mongoose.connection.db.admin().ping();

    return {
      status: 'healthy',
      isConnected,
      readyState: mongoose.connection.readyState,
      database: mongoose.connection.db ? mongoose.connection.db.databaseName : null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      isConnected,
      readyState: mongoose.connection.readyState,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  getConnectionInfo,
  healthCheck,
  connection: mongoose.connection
};