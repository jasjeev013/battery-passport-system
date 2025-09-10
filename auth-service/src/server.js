const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 3001;

// Connect to database
connectDB();

const server = app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
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