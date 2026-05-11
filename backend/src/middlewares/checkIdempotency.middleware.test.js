'use strict';

/**
 * Unit tests for checkIdempotency middleware.
 *
 * Dependencies are fully mocked so no real Redis or PostgreSQL connections
 * are required. jest-mock-extended's mockDeep() is used for the Prisma client
 * because it creates a Proxy that auto-mocks every nested property, giving us
 * type-safe mock functions (e.g. prisma.idempotencyKey.findUnique) without
 * needing to list every method manually.
 */

// ── Module mocks (must be declared before any require) ────────────────────────

jest.mock('../config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

// The factory runs inside the Jest environment, so jest.fn() (used internally
// by mockDeep) is available here even though it would fail outside Jest.
jest.mock('../config/db', () => {
  const { mockDeep } = require('jest-mock-extended');
  return mockDeep();
});

// ── Imports ───────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const redisClient = require('../config/redis');
const prisma = require('../config/db');
const checkIdempotency = require('./checkIdempotency.middleware');

// ── Shared constants (mirror the middleware's internal values) ─────────────────

const REDIS_TTL_SECONDS = 24 * 60 * 60;   // 86 400 s
const REDIS_PREFIX = 'idempotency:';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Reproduces the SHA-256 hashing the middleware applies to every raw key. */
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Constructs the exact Redis key the middleware will use for a given raw key. */
function expectedRedisKey(rawKey) {
  return `${REDIS_PREFIX}${sha256(rawKey)}`;
}

/** Returns a chainable Express res mock: res.status(n) → res, res.json(b) recorded. */
function buildRes(statusCode = 200) {
  const res = {
    statusCode,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('checkIdempotency middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    next = jest.fn();

    req = {
      headers: {},
      user: { id: BigInt(1) },
      path: '/workshops/1/register',
    };

    res = buildRes();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Missing header
  // ────────────────────────────────────────────────────────────────────────────

  describe('when the X-Idempotency-Key header is absent', () => {
    it('calls next() immediately', async () => {
      await checkIdempotency(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('does not touch Redis or the database', async () => {
      await checkIdempotency(req, res, next);

      expect(redisClient.get).not.toHaveBeenCalled();
      expect(prisma.idempotencyKey.findUnique).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 2. Redis cache hit
  // ────────────────────────────────────────────────────────────────────────────

  describe('when the key is present and found in Redis', () => {
    const RAW_KEY = 'redis-hit-uuid-1234';
    const CACHED_BODY = { registrationId: '42', status: 'confirmed' };
    const CACHED_STATUS = 201;

    beforeEach(() => {
      req.headers['x-idempotency-key'] = RAW_KEY;
      redisClient.get.mockResolvedValue(
        JSON.stringify({ status: CACHED_STATUS, body: CACHED_BODY }),
      );
    });

    it('looks up Redis using the SHA-256 hash of the raw key prefixed with "idempotency:"', async () => {
      await checkIdempotency(req, res, next);

      expect(redisClient.get).toHaveBeenCalledWith(expectedRedisKey(RAW_KEY));
    });

    it('returns the cached HTTP status and body', async () => {
      await checkIdempotency(req, res, next);

      expect(res.status).toHaveBeenCalledWith(CACHED_STATUS);
      expect(res.json).toHaveBeenCalledWith(CACHED_BODY);
    });

    it('does not call next() or query the database', async () => {
      await checkIdempotency(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(prisma.idempotencyKey.findUnique).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Redis miss → IdempotencyKey table hit
  // ────────────────────────────────────────────────────────────────────────────

  describe('when the key is not in Redis but exists in the IdempotencyKey table', () => {
    const RAW_KEY = 'db-hit-uuid-5678';
    const DB_BODY = { registrationId: '7', status: 'pending_payment' };
    const DB_STATUS = 201;

    beforeEach(() => {
      req.headers['x-idempotency-key'] = RAW_KEY;
      redisClient.get.mockResolvedValue(null);   // Redis miss
      redisClient.set.mockResolvedValue('OK');
    });

    it('returns the status and body from the database record', async () => {
      prisma.idempotencyKey.findUnique.mockResolvedValue({
        response_body: JSON.stringify(DB_BODY),
        response_status: DB_STATUS,
      });

      await checkIdempotency(req, res, next);

      expect(res.status).toHaveBeenCalledWith(DB_STATUS);
      expect(res.json).toHaveBeenCalledWith(DB_BODY);
    });

    it('defaults to HTTP 200 when response_status in the DB record is null', async () => {
      prisma.idempotencyKey.findUnique.mockResolvedValue({
        response_body: JSON.stringify({ ok: true }),
        response_status: null,
      });

      await checkIdempotency(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('does not call next()', async () => {
      prisma.idempotencyKey.findUnique.mockResolvedValue({
        response_body: JSON.stringify(DB_BODY),
        response_status: DB_STATUS,
      });

      await checkIdempotency(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });

    it('backfills Redis with the DB response so the next call hits the fast path', async () => {
      prisma.idempotencyKey.findUnique.mockResolvedValue({
        response_body: JSON.stringify(DB_BODY),
        response_status: DB_STATUS,
      });

      await checkIdempotency(req, res, next);

      expect(redisClient.set).toHaveBeenCalledWith(
        expectedRedisKey(RAW_KEY),
        JSON.stringify({ status: DB_STATUS, body: DB_BODY }),
        'EX',
        REDIS_TTL_SECONDS,
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 4. Brand-new key → intercept res.json
  // ────────────────────────────────────────────────────────────────────────────

  describe('when the key is brand-new (absent from both Redis and the DB)', () => {
    const RAW_KEY = 'new-uuid-abcd';
    const RESPONSE_BODY = { registrationId: '55', status: 'reserved' };
    const RESPONSE_STATUS = 202;

    beforeEach(() => {
      req.headers['x-idempotency-key'] = RAW_KEY;
      redisClient.get.mockResolvedValue(null);
      prisma.idempotencyKey.findUnique.mockResolvedValue(null);
      redisClient.set.mockResolvedValue('OK');
      prisma.idempotencyKey.create.mockResolvedValue({});
    });

    /**
     * Runs the middleware, then simulates the downstream handler sending a response.
     * Returns the original res.json mock captured *before* the middleware replaced it,
     * so callers can assert it was eventually called.
     */
    async function runAndTriggerInterceptor(overrides = {}) {
      const body = overrides.body ?? RESPONSE_BODY;
      const statusCode = overrides.statusCode ?? RESPONSE_STATUS;

      const originalJsonMock = res.json; // snapshot before middleware replaces it

      await checkIdempotency(req, res, next);

      // Simulate the downstream Express handler sending a response
      res.statusCode = statusCode;
      await res.json(body); // triggers the interceptor installed by the middleware

      return originalJsonMock;
    }

    it('calls next() so the request continues to the route handler', async () => {
      await checkIdempotency(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('replaces res.json with an interceptor before calling next()', async () => {
      const originalJson = res.json;

      await checkIdempotency(req, res, next);

      expect(res.json).not.toBe(originalJson);
    });

    describe('when the intercepted res.json is called by the downstream handler', () => {
      it('saves the response to Redis with the correct key, payload, and 24-hour TTL', async () => {
        await runAndTriggerInterceptor();

        expect(redisClient.set).toHaveBeenCalledWith(
          expectedRedisKey(RAW_KEY),
          JSON.stringify({ status: RESPONSE_STATUS, body: RESPONSE_BODY }),
          'EX',
          REDIS_TTL_SECONDS,
        );
      });

      it('saves the response to the IdempotencyKey table with the correct fields', async () => {
        await runAndTriggerInterceptor();

        expect(prisma.idempotencyKey.create).toHaveBeenCalledWith({
          data: {
            key_hash: sha256(RAW_KEY),
            user_id: req.user.id,
            resource_type: req.path,
            response_status: RESPONSE_STATUS,
            response_body: JSON.stringify(RESPONSE_BODY),
            expires_at: expect.any(Date),
          },
        });
      });

      it('stores an expires_at timestamp exactly 24 hours in the future', async () => {
        const before = Date.now();
        await runAndTriggerInterceptor();
        const after = Date.now();

        const { expires_at } = prisma.idempotencyKey.create.mock.calls[0][0].data;
        const expiresMs = expires_at.getTime();

        expect(expiresMs).toBeGreaterThanOrEqual(before + REDIS_TTL_SECONDS * 1000);
        expect(expiresMs).toBeLessThanOrEqual(after + REDIS_TTL_SECONDS * 1000);
      });

      it('calls the original res.json so the response is actually delivered to the client', async () => {
        const originalJsonMock = await runAndTriggerInterceptor();

        expect(originalJsonMock).toHaveBeenCalledWith(RESPONSE_BODY);
      });

      it('does not intercept a second res.json call — no double-save to Redis or DB', async () => {
        // The middleware stores originalJson = res.json.bind(res), so after the
        // interceptor fires once it restores res.json to that bound reference
        // (not the raw mock). We verify the invariant through behaviour: a second
        // call must not trigger another write to Redis or the DB.
        await checkIdempotency(req, res, next);
        res.statusCode = RESPONSE_STATUS;
        await res.json(RESPONSE_BODY); // first call — runs the interceptor

        redisClient.set.mockClear();
        prisma.idempotencyKey.create.mockClear();

        await res.json({ second: true }); // second call — must bypass the interceptor

        expect(redisClient.set).not.toHaveBeenCalled();
        expect(prisma.idempotencyKey.create).not.toHaveBeenCalled();
      });
    });

    // ── No authenticated user ──────────────────────────────────────────────

    describe('when req.user is not set', () => {
      beforeEach(() => {
        req.user = undefined;
      });

      it('still saves the response to Redis', async () => {
        await runAndTriggerInterceptor();

        expect(redisClient.set).toHaveBeenCalled();
      });

      it('does not attempt to write to the IdempotencyKey table', async () => {
        await runAndTriggerInterceptor();

        expect(prisma.idempotencyKey.create).not.toHaveBeenCalled();
      });
    });

    // ── Duplicate key race condition ───────────────────────────────────────

    describe('when prisma.create rejects with a P2002 unique-constraint error', () => {
      beforeEach(() => {
        const p2002 = Object.assign(new Error('Unique constraint violation'), {
          code: 'P2002',
        });
        prisma.idempotencyKey.create.mockRejectedValue(p2002);
      });

      it('does not propagate the error — the response is still delivered to the client', async () => {
        const originalJsonMock = await runAndTriggerInterceptor();

        expect(originalJsonMock).toHaveBeenCalledWith(RESPONSE_BODY);
      });
    });

    // ── Redis save failure ────────────────────────────────────────────────

    describe('when redisClient.set throws during the interceptor save', () => {
      beforeEach(() => {
        redisClient.set.mockRejectedValue(new Error('Redis write timeout'));
      });

      it('does not propagate the error — the response is still delivered to the client', async () => {
        const originalJsonMock = await runAndTriggerInterceptor();

        expect(originalJsonMock).toHaveBeenCalledWith(RESPONSE_BODY);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 5. Graceful degradation on lookup errors
  // ────────────────────────────────────────────────────────────────────────────

  describe('error handling during the lookup phase', () => {
    beforeEach(() => {
      req.headers['x-idempotency-key'] = 'error-scenario-key';
    });

    it('calls next() without throwing when redisClient.get rejects', async () => {
      redisClient.get.mockRejectedValue(new Error('Redis connection refused'));

      await checkIdempotency(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.json).not.toHaveBeenCalled();
    });

    it('calls next() without throwing when prisma.findUnique rejects', async () => {
      redisClient.get.mockResolvedValue(null);
      prisma.idempotencyKey.findUnique.mockRejectedValue(new Error('DB connection timeout'));

      await checkIdempotency(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
