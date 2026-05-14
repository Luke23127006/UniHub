const crypto = require('crypto');
const redisClient = require('../config/redis');
const prisma = require('../config/db');

const REDIS_TTL_SECONDS = 24 * 60 * 60;
const REDIS_PREFIX = 'idempotency:';

const checkIdempotency = async (req, res, next) => {
  const rawKey = req.headers['x-idempotency-key'];

  if (!rawKey) {
    return next();
  }

  const userId = req.user?.id ?? 'anon';
  const scopedKey = `${userId}:${req.method}:${req.originalUrl}:${rawKey}`;
  const keyHash = crypto.createHash('sha256').update(scopedKey).digest('hex');
  const redisKey = `${REDIS_PREFIX}${keyHash}`;

  try {
    // 1. Check Redis cache first (hot path)
    const cached = await redisClient.get(redisKey);
    if (cached) {
      const { status, body } = JSON.parse(cached);
      return res.status(status).json(body);
    }

    // 2. Check PostgreSQL (cache miss — Redis may have evicted it)
    const record = await prisma.idempotencyKey.findUnique({
      where: { key_hash: keyHash },
    });

    if (record?.response_body) {
      const body = JSON.parse(record.response_body);
      const status = record.response_status ?? 200;

      // Backfill Redis so the next call hits the fast path
      await redisClient.set(redisKey, JSON.stringify({ status, body }), 'EX', REDIS_TTL_SECONDS);

      return res.status(status).json(body);
    }
  } catch (err) {
    console.error('[checkIdempotency] Lookup error:', err);
    // On lookup failure, let the request through rather than blocking it
    return next();
  }

  // 3. New request — intercept res.json to persist before the response is sent
  const originalJson = res.json.bind(res);

  res.json = async function (body) {
    // Restore immediately to prevent recursion if originalJson triggers another .json call
    res.json = originalJson;

    const status = res.statusCode;
    const bodyStr = JSON.stringify(body);
    const expiresAt = new Date(Date.now() + REDIS_TTL_SECONDS * 1000);

    try {
      await redisClient.set(
        redisKey,
        JSON.stringify({ status, body }),
        'EX',
        REDIS_TTL_SECONDS,
      );

      if (req.user?.id) {
        await prisma.idempotencyKey
          .create({
            data: {
              key_hash: keyHash,
              user_id: req.user.id,
              resource_type: `${req.baseUrl}${req.path}`,
              response_status: status,
              response_body: bodyStr,
              expires_at: expiresAt,
            },
          })
          .catch((err) => {
            // P2002 = unique constraint — a concurrent request already wrote this key; safe to ignore
            if (err.code !== 'P2002') {
              console.error('[checkIdempotency] DB save error:', err);
            }
          });
      }
    } catch (saveErr) {
      console.error('[checkIdempotency] Save error:', saveErr);
    }

    return originalJson(body);
  };

  next();
};

module.exports = checkIdempotency;
