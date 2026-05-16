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
const { globalLimiter } = require('./src/middlewares/rateLimiter.middleware');
const { startReleaseReservedSeatsJob } = require('./src/jobs/releaseReservedSeats');

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

app.use("/api/v1", routes);

let server;
let rabbitRetryTimeout;
let isShuttingDown = false;

async function initBackgroundServices() {
  if (isShuttingDown) return;

  try {
    await connectRabbitMQ();
    await startRegistrationWorker();
    startReleaseReservedSeatsJob();
    console.log("RabbitMQ connected and background workers started.");
  } catch (error) {
    console.error(
      "Background services failed to start, retrying in 5s:",
      error.message,
    );
    rabbitRetryTimeout = setTimeout(initBackgroundServices, 5000);
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
