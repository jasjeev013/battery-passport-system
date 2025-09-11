const { createSystemNotification, getNotificationTemplate } = require('./emailService');

const handlePassportCreated = async (event) => {
  const template = getNotificationTemplate('passport.created', {
    batteryIdentifier: event.batteryIdentifier,
    modelName: event.modelName,
    manufacturerName: event.manufacturerName
  });

  await createSystemNotification(
    'passport.created',
    template.title,
    template.message,
    {
      passportId: event.passportId,
      createdBy: event.createdBy,
      eventData: event
    }
  );

  console.log('Handled passport.created event:', event);
};

const handlePassportUpdated = async (event) => {
  const template = getNotificationTemplate('passport.updated', {
    batteryIdentifier: event.batteryIdentifier,
    updatedFields: event.updatedFields
  });

  await createSystemNotification(
    'passport.updated',
    template.title,
    template.message,
    {
      passportId: event.passportId,
      updatedBy: event.updatedBy,
      eventData: event
    }
  );

  console.log('Handled passport.updated event:', event);
};

const handlePassportDeleted = async (event) => {
  const template = getNotificationTemplate('passport.deleted', {
    batteryIdentifier: event.batteryIdentifier,
    deletedBy: event.deletedBy
  });

  await createSystemNotification(
    'passport.deleted',
    template.title,
    template.message,
    {
      passportId: event.passportId,
      deletedBy: event.deletedBy,
      eventData: event
    }
  );

  console.log('Handled passport.deleted event:', event);
};

module.exports = {
  handlePassportCreated,
  handlePassportUpdated,
  handlePassportDeleted
};