const { Kafka } = require('kafkajs');
const { 
  handlePassportCreated, 
  handlePassportUpdated, 
  handlePassportDeleted 
} = require('../services/kafkaHandlers');
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

const connectConsumer = async () => {
  try {
    await consumer.connect();
    console.log('Kafka Consumer connected successfully');
    
    // Subscribe to topics
    await consumer.subscribe({ 
      topics: ['passport.created', 'passport.updated', 'passport.deleted'],
      fromBeginning: false 
    });
  } catch (error) {
    console.error('Error connecting Kafka consumer:', error);
  }
};

const startConsumer = async () => {
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        console.log(`Received event from topic ${topic}:`, event);

        // Handle different event types
        switch (topic) {
          case 'passport.created':
            await handlePassportCreated(event);
            break;
          case 'passport.updated':
            await handlePassportUpdated(event);
            break;
          case 'passport.deleted':
            await handlePassportDeleted(event);
            break;
          default:
            console.log(`Unknown topic: ${topic}`);
        }
      } catch (error) {
        console.error('Error processing Kafka message:', error);
      }
    }
  });
};

const disconnectConsumer = async () => {
  try {
    await consumer.disconnect();
    console.log('Kafka Consumer disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting Kafka consumer:', error);
  }
};

module.exports = {
  consumer,
  connectConsumer,
  startConsumer,
  disconnectConsumer
};