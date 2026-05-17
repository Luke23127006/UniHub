'use strict';

// jest.mock calls are hoisted above all require() calls by Jest's babel transform,
// so the mocks are in place before realtime.controller.js runs its module-level code.

jest.mock('../../config/redisPubSub', () => ({
  redisSubscriber: {
    subscribe: jest.fn(),
    on: jest.fn(),
  },
  redisPublisher: {
    publish: jest.fn(),
  },
}));

jest.mock('../../config/db', () => ({
  workshop: { findMany: jest.fn() },
}));

const prisma = require('../../config/db');
const { redisSubscriber } = require('../../config/redisPubSub');
const { streamSeats, getSeatsBatch } = require('../realtime.controller');

// The handler is registered once at module load time. Capture it immediately here,
// before any beforeEach/clearAllMocks wipes the mock's call history.
const onMessageCall = redisSubscriber.on.mock.calls.find(([event]) => event === 'message');
if (!onMessageCall) throw new Error('realtime.controller did not register a message handler on redisSubscriber');
const messageHandler = onMessageCall[1];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let openReqs = [];

function makeReq(ids = '') {
  let closeHandler = null;
  const req = {
    query: { ids },
    on: jest.fn((event, handler) => {
      if (event === 'close') closeHandler = handler;
    }),
    simulateClose: () => closeHandler?.(),
  };
  openReqs.push(req);
  return req;
}

function makeRes() {
  return {
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  // Drain every SSE connection opened during this test so the module-level
  // activeClients Map is empty before the next test runs.
  openReqs.forEach((req) => req.simulateClose());
  openReqs = [];
});

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

describe('streamSeats — Connection Init', () => {
  it('sets the required SSE headers on the response', () => {
    const req = makeReq('1,2,3');
    const res = makeRes();

    streamSeats(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(res.flushHeaders).toHaveBeenCalledTimes(1);
  });

  it('registers a close listener on req to enable cleanup', () => {
    const req = makeReq('1');
    const res = makeRes();

    streamSeats(req, res);

    expect(req.on).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('does not push any data immediately — connection stays open awaiting events', () => {
    const req = makeReq('1');
    const res = makeRes();

    streamSeats(req, res);

    expect(res.write).not.toHaveBeenCalled();
  });
});

describe('streamSeats — Broadcasting', () => {
  it('writes a correctly-formatted SSE data frame to a subscribed client', () => {
    const req = makeReq('10');
    const res = makeRes();
    streamSeats(req, res);

    messageHandler('seat_updates', JSON.stringify({ workshopId: 10, availableSeats: 49 }));

    expect(res.write).toHaveBeenCalledTimes(1);
    expect(res.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ workshopId: 10, availableSeats: 49 })}\n\n`
    );
  });

  it('only notifies clients whose trackedWorkshopIds include the changed ID', () => {
    const reqA = makeReq('10');
    const resA = makeRes();
    const reqB = makeReq('20');
    const resB = makeRes();
    streamSeats(reqA, resA);
    streamSeats(reqB, resB);

    messageHandler('seat_updates', JSON.stringify({ workshopId: 10, availableSeats: 48 }));

    expect(resA.write).toHaveBeenCalledTimes(1);
    expect(resB.write).not.toHaveBeenCalled();
  });

  it('broadcasts to every client subscribed to the same workshopId', () => {
    const reqA = makeReq('30');
    const resA = makeRes();
    const reqB = makeReq('30');
    const resB = makeRes();
    streamSeats(reqA, resA);
    streamSeats(reqB, resB);

    messageHandler('seat_updates', JSON.stringify({ workshopId: 30, availableSeats: 5 }));

    expect(resA.write).toHaveBeenCalledTimes(1);
    expect(resB.write).toHaveBeenCalledTimes(1);
  });

  it('ignores messages published on channels other than seat_updates', () => {
    const req = makeReq('40');
    const res = makeRes();
    streamSeats(req, res);

    messageHandler('unrelated_channel', JSON.stringify({ workshopId: 40, availableSeats: 3 }));

    expect(res.write).not.toHaveBeenCalled();
  });

  it('does not throw and does not write on malformed JSON messages', () => {
    const req = makeReq('50');
    const res = makeRes();
    streamSeats(req, res);

    expect(() =>
      messageHandler('seat_updates', '{bad json}')
    ).not.toThrow();
    expect(res.write).not.toHaveBeenCalled();
  });
});

describe('getSeatsBatch', () => {
  function makeBatchRes() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  }

  it('returns 400 when ids query param is absent', async () => {
    const req = { query: {} };
    const res = makeBatchRes();
    await getSeatsBatch(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
  });

  it('returns 400 when ids contains no valid positive integers', async () => {
    const req = { query: { ids: 'abc,0,-1' } };
    const res = makeBatchRes();
    await getSeatsBatch(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns a string-keyed map of workshopId -> available_seats including BigInt id serialization', async () => {
    prisma.workshop.findMany.mockResolvedValueOnce([
      { id: BigInt(1), available_seats: 10 },
      { id: BigInt(2), available_seats: 5 },
    ]);
    const req = { query: { ids: '1,2' } };
    const res = makeBatchRes();
    await getSeatsBatch(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ '1': 10, '2': 5 });
  });

  it('returns 500 when Prisma throws', async () => {
    prisma.workshop.findMany.mockRejectedValueOnce(new Error('DB error'));
    const req = { query: { ids: '1' } };
    const res = makeBatchRes();
    await getSeatsBatch(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });
});

describe('streamSeats — Cleanup', () => {
  it('stops broadcasting to a client after its req emits close', () => {
    const req = makeReq('60');
    const res = makeRes();
    streamSeats(req, res);

    req.simulateClose();
    openReqs = openReqs.filter((r) => r !== req); // prevent double-close in afterEach

    messageHandler('seat_updates', JSON.stringify({ workshopId: 60, availableSeats: 0 }));

    expect(res.write).not.toHaveBeenCalled();
  });

  it('removes only the closed client while keeping other active clients intact', () => {
    const reqA = makeReq('70');
    const resA = makeRes();
    const reqB = makeReq('70');
    const resB = makeRes();
    streamSeats(reqA, resA);
    streamSeats(reqB, resB);

    reqA.simulateClose();
    openReqs = openReqs.filter((r) => r !== reqA);

    messageHandler('seat_updates', JSON.stringify({ workshopId: 70, availableSeats: 15 }));

    expect(resA.write).not.toHaveBeenCalled();
    expect(resB.write).toHaveBeenCalledTimes(1);
  });
});
