// mockConsume is declared with the `mock` prefix so Jest's babel transform
// hoists its initialisation above the jest.mock() factory call.
const mockConsume = jest.fn();

jest.mock('../../config/redis', () => ({}));

jest.mock('rate-limiter-flexible', () => ({
  RateLimiterRedis: jest.fn().mockImplementation(() => ({ consume: mockConsume })),
}));

const { globalLimiter, registrationLimiter } = require('../rateLimiter.middleware');

const TOO_MANY_REQUESTS = {
  error: 'TOO_MANY_REQUESTS',
  message: 'The system is busy processing, please do not spam. Please try again in a few seconds.',
};

function makeRes() {
  const res = {
    set: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

function makeReq({ ip = '1.2.3.4', headers = {}, user = undefined } = {}) {
  return { ip, headers, user };
}

describe('rateLimiter middleware', () => {
  let res, next;

  beforeEach(() => {
    mockConsume.mockReset();
    res = makeRes();
    next = jest.fn();
  });

  // ─── globalLimiter ────────────────────────────────────────────────────────

  describe('globalLimiter', () => {
    it('calls next() when under the limit', async () => {
      mockConsume.mockResolvedValueOnce({});
      const req = makeReq();

      await globalLimiter(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('uses req.ip as the rate-limit key', async () => {
      mockConsume.mockResolvedValueOnce({});
      const req = makeReq({ ip: '192.168.1.10' });

      await globalLimiter(req, res, next);

      expect(mockConsume).toHaveBeenCalledWith('192.168.1.10');
    });

    it('returns 429 with correct body when limit is exceeded', async () => {
      mockConsume.mockRejectedValueOnce({ msBeforeNext: 5000 });
      const req = makeReq();

      await globalLimiter(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(TOO_MANY_REQUESTS);
    });

    it('sets Retry-After header to ceil(msBeforeNext / 1000) seconds', async () => {
      mockConsume.mockRejectedValueOnce({ msBeforeNext: 7300 });
      const req = makeReq();

      await globalLimiter(req, res, next);

      // Math.ceil(7300 / 1000) === 8
      expect(res.set).toHaveBeenCalledWith('Retry-After', 8);
    });

    it('forwards operational errors (no msBeforeNext) to next()', async () => {
      const err = new Error('Redis connection failed');
      mockConsume.mockRejectedValueOnce(err);
      const req = makeReq();

      await globalLimiter(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ─── registrationLimiter ─────────────────────────────────────────────────

  describe('registrationLimiter', () => {
    it('calls next() when under the limit', async () => {
      mockConsume.mockResolvedValueOnce({});
      const req = makeReq({ user: { id: 1 } });

      await registrationLimiter(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('uses req.user.id (stringified) as the rate-limit key when authenticated', async () => {
      mockConsume.mockResolvedValueOnce({});
      const req = makeReq({ user: { id: 42 } });

      await registrationLimiter(req, res, next);

      expect(mockConsume).toHaveBeenCalledWith('42');
    });

    it('falls back to req.ip when user is not authenticated', async () => {
      mockConsume.mockResolvedValueOnce({});
      const req = makeReq({ ip: '10.0.0.5' });

      await registrationLimiter(req, res, next);

      expect(mockConsume).toHaveBeenCalledWith('10.0.0.5');
    });

    it('returns 429 with correct body when the 2 req/10 s limit is exceeded', async () => {
      mockConsume.mockRejectedValueOnce({ msBeforeNext: 3500 });
      const req = makeReq({ user: { id: 42 } });

      await registrationLimiter(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(TOO_MANY_REQUESTS);
    });

    it('sets Retry-After header to ceil(msBeforeNext / 1000) seconds', async () => {
      mockConsume.mockRejectedValueOnce({ msBeforeNext: 3500 });
      const req = makeReq({ user: { id: 42 } });

      await registrationLimiter(req, res, next);

      // Math.ceil(3500 / 1000) === 4
      expect(res.set).toHaveBeenCalledWith('Retry-After', 4);
    });

    it('forwards operational errors (no msBeforeNext) to next()', async () => {
      const err = new Error('Redis connection failed');
      mockConsume.mockRejectedValueOnce(err);
      const req = makeReq({ user: { id: 1 } });

      await registrationLimiter(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
