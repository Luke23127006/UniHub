require('dotenv/config');
const express = require('express');
const cors = require('cors');
const prisma = require('./src/config/db');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/v1', routes);

const server = app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});

async function shutdown() {
  console.log('Shutting down...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Bye.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
