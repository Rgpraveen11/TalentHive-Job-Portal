const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options suppress deprecation warnings in Mongoose 7+
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅  MongoDB connected: ${conn.connection.host}`);

    // Log when connection is lost
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    // Log when reconnected
    mongoose.connection.on('reconnected', () => {
      console.log('✅  MongoDB reconnected');
    });

    // Log errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error(`❌  MongoDB error: ${err.message}`);
    });
  } catch (error) {
    console.error(`❌  MongoDB connection failed: ${error.message}`);
    // Exit process with failure — let the host restart it
    process.exit(1);
  }
};

module.exports = connectDB;