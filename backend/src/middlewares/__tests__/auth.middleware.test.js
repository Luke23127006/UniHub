'use strict';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any require() calls.
// Jest hoists these to the top of the module scope automatically.
// ---------------------------------------------------------------------------

/**
 * Keep the real jsonwebtoken error classes (needed for instanceof checks
 * inside verifyToken) but replace verify() with a controllable mock.
 */
jest.mock('jsonwebtoken', () => {
  const actual = jest.requireActual('jsonwebtoken');
  return { ...actual, verify: jest.fn() };
});

/**
 * Replace the Prisma client with a plain object whose methods are jest.fn().
 * verifyOwner only calls prisma.registration.findUnique, so that is all we need.
 */
jest.mock('../../config/db', () => ({
  registration: {
    findUnique: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports — loaded after mocks are in place
// ---------------------------------------------------------------------------

const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');

const verifyToken = require('../authMiddleware');
const requireRoles = require('../rbacMiddleware');
const verifyOwner = require('../ownerMiddleware');

// ---------------------------------------------------------------------------
// Shared test helpers
// ---------------------------------------------------------------------------

/** Creates a chainable mock Express Response. */
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const VALID_PAYLOAD = {
  sub: '42',
  email: 'student@uni.edu',
  role: 'Student',
  iat: 1716300000,
  exp: 1716303600,
};

// ===========================================================================
// verifyToken — Tier 1: Authentication
// ===========================================================================

describe('verifyToken', () => {
  const SECRET = 'unit_test_secret';

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_ACCESS_SECRET;
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('calls next() and attaches decoded payload to req.user when token is valid', () => {
    jwt.verify.mockReturnValue(VALID_PAYLOAD);

    const req = { headers: { authorization: 'Bearer valid.jwt.token' } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    // verify() was called with the stripped token and the correct secret
    expect(jwt.verify).toHaveBeenCalledWith('valid.jwt.token', SECRET);

    // Payload propagated to req.user exactly as returned by jwt.verify
    expect(req.user).toEqual(VALID_PAYLOAD);

    // next() reached, no error response sent
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Missing / malformed header ─────────────────────────────────────────────

  it('returns 401 MISSING_TOKEN when Authorization header is absent', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'MISSING_TOKEN' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 MISSING_TOKEN when header uses a non-Bearer scheme', () => {
    const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'MISSING_TOKEN' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 MISSING_TOKEN when "Bearer" prefix has no trailing space', () => {
    // "Bearer" without the required space is not a valid prefix
    const req = { headers: { authorization: 'Bearertoken' } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'MISSING_TOKEN' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ── Token verification failures ────────────────────────────────────────────

  it('returns 401 TOKEN_EXPIRED and hints at Refresh Token when token is expired', () => {
    jwt.verify.mockImplementation(() => {
      throw new jwt.TokenExpiredError('jwt expired', new Date());
    });

    const req = { headers: { authorization: 'Bearer expired.token' } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);

    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('TOKEN_EXPIRED');
    // The error message must mention the Refresh Token so clients know what to do next
    expect(body.error.message).toMatch(/Refresh Token/i);

    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 INVALID_TOKEN when the token signature has been tampered with', () => {
    jwt.verify.mockImplementation(() => {
      throw new jwt.JsonWebTokenError('invalid signature');
    });

    const req = { headers: { authorization: 'Bearer tampered.token' } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_TOKEN' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 INVALID_TOKEN when the token is structurally malformed', () => {
    jwt.verify.mockImplementation(() => {
      throw new jwt.JsonWebTokenError('jwt malformed');
    });

    const req = { headers: { authorization: 'Bearer not.a.real.jwt' } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_TOKEN' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ── Server misconfiguration ────────────────────────────────────────────────

  it('returns 500 SERVER_MISCONFIGURATION when JWT_ACCESS_SECRET env var is not set', () => {
    delete process.env.JWT_ACCESS_SECRET; // simulate missing env var

    // Suppress the intentional console.error — it fires in this code path by design
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const req = { headers: { authorization: 'Bearer any.token' } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'SERVER_MISCONFIGURATION' }),
      })
    );
    expect(next).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

// ===========================================================================
// requireRoles — Tier 2: Authorization
// ===========================================================================

describe('requireRoles', () => {
  // ── Happy paths ────────────────────────────────────────────────────────────

  it('calls next() when req.user.role exactly matches a single allowed role', () => {
    const req = { user: { role: 'Admin' } };
    const res = mockRes();
    const next = jest.fn();

    requireRoles(['Admin'])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when req.user.role is one of several allowed roles', () => {
    const req = { user: { role: 'Staff' } };
    const res = mockRes();
    const next = jest.fn();

    requireRoles(['Admin', 'Staff'])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Forbidden paths ────────────────────────────────────────────────────────

  it('returns 403 FORBIDDEN when req.user.role is not in the allowed list', () => {
    const req = { user: { role: 'Student' } };
    const res = mockRes();
    const next = jest.fn();

    requireRoles(['Admin'])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 FORBIDDEN when the allowed list is empty', () => {
    const req = { user: { role: 'Admin' } };
    const res = mockRes();
    const next = jest.fn();

    requireRoles([])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Defensive: missing req.user (verifyToken not in chain) ────────────────

  it('returns 403 without crashing when req.user is undefined', () => {
    const req = {}; // verifyToken was accidentally omitted from the route
    const res = mockRes();
    const next = jest.fn();

    requireRoles(['Admin'])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// verifyOwner — Tier 3: Data Segregation (IDOR prevention)
// ===========================================================================

describe('verifyOwner', () => {
  // ── Happy path ─────────────────────────────────────────────────────────────

  it('calls next() when req.user.sub matches the registration owner user_id', async () => {
    prisma.registration.findUnique.mockResolvedValue({
      student: { user_id: 42n },
    });

    const req = { params: { id: '1' }, user: { sub: '42' } };
    const res = mockRes();
    const next = jest.fn();

    await verifyOwner(req, res, next);

    expect(prisma.registration.findUnique).toHaveBeenCalledWith({
      where: { id: 1n },
      select: { student: { select: { user_id: true } } },
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Resource not found (404 to hide existence from attacker) ──────────────

  it('returns 404 NOT_FOUND when the registration does not exist', async () => {
    prisma.registration.findUnique.mockResolvedValue(null);

    const req = { params: { id: '999' }, user: { sub: '42' } };
    const res = mockRes();
    const next = jest.fn();

    await verifyOwner(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'NOT_FOUND' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ── IDOR attempt: valid token, valid resource, wrong owner ────────────────

  it('returns 403 FORBIDDEN when req.user.sub does not match the resource owner', async () => {
    // Ticket owned by user 42, but requestor is user 99
    prisma.registration.findUnique.mockResolvedValue({
      student: { user_id: 42n },
    });

    const req = { params: { id: '1' }, user: { sub: '99' } };
    const res = mockRes();
    const next = jest.fn();

    await verifyOwner(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ── Invalid ID format ──────────────────────────────────────────────────────

  it('returns 400 INVALID_ID when req.params.id is not a numeric string', async () => {
    const req = { params: { id: 'not-a-number' }, user: { sub: '42' } };
    const res = mockRes();
    const next = jest.fn();

    await verifyOwner(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_ID' }),
      })
    );
    // Prisma must never be reached for a bad ID
    expect(prisma.registration.findUnique).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 INVALID_ID when req.params.id is an empty string', async () => {
    // BigInt('') === 0n in Node.js — does NOT throw. The middleware uses an
    // explicit regex guard so empty strings are caught before conversion.
    const req = { params: { id: '' }, user: { sub: '42' } };
    const res = mockRes();
    const next = jest.fn();

    await verifyOwner(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_ID' }),
      })
    );
    expect(prisma.registration.findUnique).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 INVALID_ID when req.params.id is zero', async () => {
    // Zero is not a valid database primary key in this system
    const req = { params: { id: '0' }, user: { sub: '42' } };
    const res = mockRes();
    const next = jest.fn();

    await verifyOwner(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.registration.findUnique).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
