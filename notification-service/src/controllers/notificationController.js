const Notification = require('../models/Notification');
const { 
  sendEmailNotification, 
  createSystemNotification, 
  getNotificationTemplate 
} = require('../services/emailService');

// Create a new notification
const createNotification = async (req, res) => {
  try {
    const { 
      type, 
      eventType, 
      title, 
      message, 
      recipient, 
      recipientEmail, 
      priority, 
      metadata 
    } = req.body;

    // Validate required fields
    if (!type || !eventType || !title || !message) {
      return res.status(400).json({ 
        message: 'Type, eventType, title, and message are required' 
      });
    }

    if (type === 'email' && !recipient && !recipientEmail) {
      return res.status(400).json({ 
        message: 'Recipient or recipientEmail is required for email notifications' 
      });
    }

    const notification = new Notification({
      type,
      eventType,
      title,
      message,
      recipient: recipient || null,
      recipientEmail: recipientEmail || null,
      priority: priority || 'medium',
      metadata: metadata ? new Map(Object.entries(metadata)) : new Map(),
      status: type === 'email' ? 'pending' : 'sent'
    });

    await notification.save();

    // If it's an email notification, try to send it
    if (type === 'email') {
      const sendResult = await sendEmailNotification(notification._id);
      
      if (!sendResult.success) {
        console.warn('Failed to send email notification:', sendResult.error);
      }
    }

    res.status(201).json({
      message: 'Notification created successfully',
      notification: {
        id: notification._id,
        type: notification.type,
        eventType: notification.eventType,
        title: notification.title,
        status: notification.status
      }
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Server error during notification creation' });
  }
};

// Get user's notifications
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, status, type } = req.query;

    const query = { 
      $or: [
        { recipient: userId },
        { type: { $ne: 'email' } } // Include system notifications for all users
      ],
      isActive: true
    };

    if (status) query.status = status;
    if (type) query.type = type;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: 'recipient'
    };

    const notifications = await Notification.find(query)
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit)
      .populate('recipient', 'email role');

    const total = await Notification.countDocuments(query);

    res.json({
      message: 'Notifications retrieved successfully',
      notifications,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error retrieving notifications' });
  }
};

// Get notification by ID
const getNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOne({
      _id: id,
      isActive: true,
      $or: [
        { recipient: userId },
        { type: { $ne: 'email' } }
      ]
    }).populate('recipient', 'email role');

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      message: 'Notification retrieved successfully',
      notification
    });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ message: 'Server error retrieving notification' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOne({
      _id: id,
      isActive: true,
      $or: [
        { recipient: userId },
        { type: { $ne: 'email' } }
      ]
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.markAsRead();
    await notification.save();

    res.json({
      message: 'Notification marked as read',
      notification: {
        id: notification._id,
        status: notification.status,
        readAt: notification.readAt
      }
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
};

// Delete notification (soft delete)
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOne({
      _id: id,
      isActive: true,
      $or: [
        { recipient: userId },
        { type: { $ne: 'email' } }
      ]
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isActive = false;
    await notification.save();

    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
};

// Get notification statistics
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await Notification.aggregate([
      {
        $match: {
          isActive: true,
          $or: [
            { recipient: userId ? mongoose.Types.ObjectId(userId) : null },
            { type: { $ne: 'email' } }
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Notification.countDocuments({
      isActive: true,
      $or: [
        { recipient: userId },
        { type: { $ne: 'email' } }
      ]
    });

    const unreadCount = await Notification.countDocuments({
      isActive: true,
      status: 'unread',
      $or: [
        { recipient: userId },
        { type: { $ne: 'email' } }
      ]
    });

    res.json({
      message: 'Notification statistics retrieved successfully',
      stats: {
        total,
        unread: unreadCount,
        byStatus: stats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error retrieving notification statistics' });
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  getNotification,
  markAsRead,
  deleteNotification,
  getNotificationStats
};