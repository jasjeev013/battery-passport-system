const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const Notification = require('../models/Notification');

// Create email transporter
const createTransporter = () => {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true' && 
      process.env.SMTP_HOST && 
      process.env.SMTP_USER && 
      process.env.SMTP_PASS) {
    
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
};

const transporter = createTransporter();

// Ensure notification log directory exists
const ensureLogDirectory = () => {
  const logPath = process.env.NOTIFICATION_LOG_PATH || './notifications';
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
  }
  return logPath;
};

// Log notification to file (fallback when email is not configured)
const logToFile = async (notificationData) => {
  try {
    const logPath = ensureLogDirectory();
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `notification-${timestamp}.txt`;
    const filePath = path.join(logPath, filename);

    const logContent = `
Notification Log - ${new Date().toLocaleString()}
----------------------------------------------
Event Type: ${notificationData.eventType}
Type: ${notificationData.type}
Title: ${notificationData.title}
Message: ${notificationData.message}
Recipient: ${notificationData.recipientEmail || 'N/A'}
Status: ${notificationData.status}
Priority: ${notificationData.priority}
Metadata: ${JSON.stringify(notificationData.metadata, null, 2)}
----------------------------------------------
    `;

    fs.writeFileSync(filePath, logContent.trim());
    console.log(`Notification logged to file: ${filePath}`);
    
    return { success: true, filePath };
  } catch (error) {
    console.error('Error logging notification to file:', error);
    return { success: false, error: error.message };
  }
};

// Send email notification
const sendEmailNotification = async (notificationId) => {
  try {
    const notification = await Notification.findById(notificationId).populate('recipient');
    
    if (!notification || notification.type !== 'email') {
      throw new Error('Invalid email notification');
    }

    if (!transporter) {
      // Fallback to file logging if email is not configured
      const result = await logToFile({
        eventType: notification.eventType,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        recipientEmail: notification.recipientEmail,
        status: 'logged_to_file',
        priority: notification.priority,
        metadata: notification.metadata
      });

      if (result.success) {
        notification.status = 'sent';
        notification.sentAt = new Date();
        notification.metadata.set('logFilePath', result.filePath);
        await notification.save();
        return { success: true, method: 'file' };
      } else {
        throw new Error('Failed to log notification to file');
      }
    }

    const mailOptions = {
      from: {
        name: process.env.FROM_NAME || 'Battery Passport System',
        address: process.env.FROM_EMAIL || process.env.SMTP_USER
      },
      to: notification.recipientEmail,
      subject: notification.title,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f4f4f4; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #fff; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Battery Passport System</h2>
            </div>
            <div class="content">
              <h3>${notification.title}</h3>
              <p>${notification.message.replace(/\n/g, '<br>')}</p>
              ${notification.metadata && notification.metadata.size > 0 ? `
                <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #007bff;">
                  <h4>Details:</h4>
                  <pre style="font-size: 12px;">${JSON.stringify(Object.fromEntries(notification.metadata), null, 2)}</pre>
                </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Battery Passport System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `${notification.title}\n\n${notification.message}\n\n${notification.metadata && notification.metadata.size > 0 ? `Details: ${JSON.stringify(Object.fromEntries(notification.metadata), null, 2)}` : ''}`
    };

    const info = await transporter.sendMail(mailOptions);
    
    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.metadata.set('emailMessageId', info.messageId);
    await notification.save();

    console.log('Email sent successfully:', info.messageId);
    return { success: true, method: 'email', messageId: info.messageId };

  } catch (error) {
    console.error('Error sending email notification:', error);
    
    // Update notification status to failed
    const notification = await Notification.findById(notificationId);
    if (notification) {
      notification.status = 'failed';
      notification.retryCount += 1;
      await notification.save();
    }

    return { 
      success: false, 
      method: 'email', 
      error: error.message 
    };
  }
};

// Create system notification (for internal logging)
const createSystemNotification = async (eventType, title, message, metadata = {}) => {
  try {
    const notification = new Notification({
      type: 'system',
      eventType,
      title,
      message,
      status: 'sent',
      priority: 'medium',
      metadata: new Map(Object.entries(metadata)),
      sentAt: new Date()
    });

    await notification.save();
    
    // Also log to console for immediate visibility
    console.log(`[SYSTEM NOTIFICATION] ${title}: ${message}`);
    
    return notification;
  } catch (error) {
    console.error('Error creating system notification:', error);
    throw error;
  }
};

// Get notification template based on event type
const getNotificationTemplate = (eventType, data = {}) => {
  const templates = {
    'passport.created': {
      title: 'New Battery Passport Created',
      message: `A new battery passport has been created successfully.\n\nBattery Identifier: ${data.batteryIdentifier || 'N/A'}\nModel: ${data.modelName || 'N/A'}\nManufacturer: ${data.manufacturerName || 'N/A'}`
    },
    'passport.updated': {
      title: 'Battery Passport Updated',
      message: `A battery passport has been updated.\n\nBattery Identifier: ${data.batteryIdentifier || 'N/A'}\nUpdated Fields: ${data.updatedFields ? data.updatedFields.join(', ') : 'N/A'}`
    },
    'passport.deleted': {
      title: 'Battery Passport Deleted',
      message: `A battery passport has been deleted.\n\nBattery Identifier: ${data.batteryIdentifier || 'N/A'}\nDeleted By: ${data.deletedBy || 'System'}`
    },
    'document.uploaded': {
      title: 'Document Uploaded Successfully',
      message: `A new document has been uploaded to the system.\n\nFile Name: ${data.fileName || 'N/A'}\nSize: ${data.fileSize ? `${(data.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}`
    },
    'document.deleted': {
      title: 'Document Deleted',
      message: `A document has been deleted from the system.\n\nFile Name: ${data.fileName || 'N/A'}\nDeleted By: ${data.deletedBy || 'System'}`
    },
    'user.registered': {
      title: 'Welcome to Battery Passport System',
      message: `Thank you for registering with the Battery Passport System!\n\nYour account has been created successfully. You can now login and start using the system.`
    },
    'user.login': {
      title: 'Successful Login',
      message: `You have successfully logged into your account.\n\nLogin Time: ${new Date().toLocaleString()}\nIf this wasn't you, please contact support immediately.`
    },
    'system.alert': {
      title: 'System Alert',
      message: data.message || 'A system alert has been triggered.'
    },
    'general.info': {
      title: data.title || 'Information',
      message: data.message || 'This is a general information notification.'
    }
  };

  return templates[eventType] || {
    title: 'Notification',
    message: 'You have a new notification from the system.'
  };
};

module.exports = {
  sendEmailNotification,
  createSystemNotification,
  getNotificationTemplate,
  logToFile
};