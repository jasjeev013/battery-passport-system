const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'battery-passport-service',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092']
});

const producer = kafka.producer();

const connectProducer = async () => {
  try {
    await producer.connect();
    console.log('Kafka Producer connected successfully');
  } catch (error) {
    console.error('Error connecting Kafka producer:', error);
  }
};

const disconnectProducer = async () => {
  try {
    await producer.disconnect();
    console.log('Kafka Producer disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting Kafka producer:', error);
  }
};

const sendEvent = async (topic, event) => {
  try {
    await producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(event),
          timestamp: Date.now()
        }
      ]
    });
    console.log(`Event sent to topic ${topic}:`, event);
  } catch (error) {
    console.error('Error sending event to Kafka:', error);
  }
};

module.exports = {
  producer,
  connectProducer,
  disconnectProducer,
  sendEvent
};