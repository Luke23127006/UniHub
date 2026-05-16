require('dotenv/config');

// Global BigInt serialization fix for Prisma
BigInt.prototype.toJSON = function() {
  return this.toString();
};

const express = require('express');
const cors = require('cors');
const prisma = require('./src/config/db');
const routes = require('./src/routes');
const { connectRabbitMQ, closeRabbitMQ } = require('./src/config/rabbitmq');
const { startRegistrationWorker } = require('./src/jobs/registrationWorker');

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  next();
});

// app.use(globalLimiter); // Temporarily disabled for debugging

app.use('/api/v1', routes);

let server;
let rabbitRetryTimeout;
let isShuttingDown = false;

async function initBackgroundServices() {
  if (isShuttingDown) return;

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

function bootstrap() {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port http://0.0.0.0:${PORT}`);
  });

  server.keepAliveTimeout = 61000;
  server.headersTimeout = 65000;

  initBackgroundServices();
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

function bootstrap() {
  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port http://0.0.0.0:${PORT}`);
  });

  server.keepAliveTimeout = 61000;
  server.headersTimeout = 65000;

  initBackgroundServices();
}

bootstrap();

async function shutdown() {
  isShuttingDown = true;
  console.log("Shutting down...");

  if (rabbitRetryTimeout) {
    clearTimeout(rabbitRetryTimeout);
  }

  if (server) {
    server.close(async () => {
      await closeRabbitMQ();
      await prisma.$disconnect();
      console.log("Database disconnected. Bye.");
      process.exit(0);
    });
  } else {
    await closeRabbitMQ();
    await prisma.$disconnect();
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
