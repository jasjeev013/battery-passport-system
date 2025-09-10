const express = require('express');
const { 
  createNotification, 
  getUserNotifications, 
  getNotification, 
  markAsRead, 
  deleteNotification, 
  getNotificationStats 
} = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.post('/', createNotification);
router.get('/', getUserNotifications);
router.get('/stats', getNotificationStats);
router.get('/:id', getNotification);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;