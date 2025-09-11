const app = require('./app');
const connectDB = require('./config/database');
const { connectConsumer, startConsumer, disconnectConsumer } = require('./config/kafka');

const PORT = process.env.PORT || 3004;

// Connect to database
connectDB();
connectConsumer().then(() => {
  startConsumer();
});

const server = app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
  console.log(`Email notifications: ${process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Notification log path: ${process.env.NOTIFICATION_LOG_PATH || './notifications'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection! Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

const gracefulShutdown = async () => {
  console.log('Received shutdown signal, shutting down gracefully...');
  
  await disconnectConsumer();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);