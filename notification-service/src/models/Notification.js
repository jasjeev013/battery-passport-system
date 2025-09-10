const mongoose = require('mongoose');
require('./User')
const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['email', 'system', 'alert', 'info', 'warning', 'error'],
    default: 'system'
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'passport.created',
      'passport.updated',
      'passport.deleted',
      'document.uploaded',
      'document.deleted',
      'user.registered',
      'user.login',
      'system.alert',
      'general.info'
    ]
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'email';
    }
  },
  recipientEmail: {
    type: String,
    required: function() {
      return this.type === 'email';
    },
    trim: true,
    lowercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'read', 'unread'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  sentAt: {
    type: Date
  },
  readAt: {
    type: Date
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ eventType: 1, createdAt: -1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ createdAt: -1 });

// Virtual for checking if notification can be retried
notificationSchema.virtual('canRetry').get(function() {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
});

// Method to mark as sent
notificationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  this.retryCount = 0;
};

// Method to mark as failed
notificationSchema.methods.markAsFailed = function() {
  this.status = 'failed';
  this.retryCount += 1;
};

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
};

module.exports = mongoose.model('Notification', notificationSchema);