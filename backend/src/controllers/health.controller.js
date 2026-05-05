const prisma = require('../config/db');

async function healthCheck(req, res) {
  const result = {
    status: 'UP',
    uptime: process.uptime(),
    db: 'UP',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    result.db = 'DOWN';
    console.error('Health check database probe failed:', err);
    return res.status(503).json(result);
  }

  return res.status(200).json(result);
}

module.exports = { healthCheck };
