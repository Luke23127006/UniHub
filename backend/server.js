require('dotenv/config');
const express = require('express');
const cors = require('cors');
const prisma = require('./src/config/db');
const routes = require('./src/routes');
const { connectRabbitMQ, closeRabbitMQ } = require('./src/config/rabbitmq');
const { startRegistrationWorker } = require('./src/jobs/registrationWorker');
const { globalLimiter } = require('./src/middlewares/rateLimiter.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(globalLimiter);

app.use('/api/v1', routes);

let server;

async function bootstrap() {
  try {
    // Initialize RabbitMQ connection
    await connectRabbitMQ();
    
    // Start the worker to consume messages
    await startRegistrationWorker();

    server = app.listen(PORT, () => {
      console.log(`Server running on port http://localhost:${PORT}`);
    });
   
    // Config keep alive timeout and headers timeout
    // This is needed for long polling connections (SSE)
    server.keepAliveTimeout = 61000;
    server.headersTimeout = 65000;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

async function shutdown() {
  console.log('Shutting down...');
  if (server) {
    server.close(async () => {
      await closeRabbitMQ();
      await prisma.$disconnect();
      console.log('Database disconnected. Bye.');
      process.exit(0);
    });
  } else {
    await closeRabbitMQ();
    await prisma.$disconnect();
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
