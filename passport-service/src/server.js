const app = require('./app');
const connectDB = require('./config/database');
const { connectProducer, disconnectProducer } = require('./config/kafka');

const PORT = process.env.PORT || 3002;

// Connect to database
connectDB();
connectProducer();

const server = app.listen(PORT, () => {
  console.log(`Battery Passport Service running on port ${PORT}`);
});

const gracefulShutdown = async () => {
  console.log('Received shutdown signal, shutting down gracefully...');
  
  await disconnectProducer();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

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