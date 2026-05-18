'use strict';

// Hoist before any require() that loads sseManager or redisPubSub
jest.mock('../config/redisPubSub', () => ({
  redisSubscriber: { subscribe: jest.fn(), on: jest.fn() },
  redisPublisher: { publish: jest.fn() },
}));

jest.mock('../config/db', () => ({
  workshop: { findMany: jest.fn(), findUnique: jest.fn() },
  room: { findMany: jest.fn() },
  speaker: { findMany: jest.fn() },
}));

jest.mock('../services/workshop.service');
jest.mock('../services/aiSummary.service');
jest.mock('../middlewares/authMiddleware', () => (req, res, next) => next());
jest.mock('../middlewares/rbacMiddleware', () => () => (req, res, next) => next());
jest.mock('../config/multer', () => ({ single: () => (req, res, next) => next() }));

const http = require('http');
const express = require('express');
const { redisSubscriber } = require('../config/redisPubSub');
const workshopRoutes = require('../routes/workshop.routes');

if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () { return this.toString(); };
}

const app = express();
app.use(express.json());
app.use('/api/v1/workshops', workshopRoutes);

// ─── Server lifecycle ─────────────────────────────────────────────────────────

let httpServer;
let port;
let messageHandler;

// Tracks every req opened during a test so afterEach can drain them all
const openReqs = [];

beforeAll(async () => {
  await new Promise((resolve) => {
    httpServer = http.createServer(app);
    httpServer.listen(0, '127.0.0.1', resolve);
  });
  port = httpServer.address().port;

  // Prime the SSE manager so it runs ensureSubscribed() and registers its
  // Redis message handler.
  await new Promise((resolve, reject) => {
    const req = http.get(
      `http://127.0.0.1:${port}/api/v1/workshops/sse/seat-updates`,
      (res) => {
        res.resume(); // drain the stream so the socket stays healthy
        setTimeout(() => {
          req.destroy();
          setTimeout(resolve, 60); // let the server handle the close event
        }, 40);
      }
    );
    req.on('error', reject);
  });

  const call = redisSubscriber.on.mock.calls.find(([ev]) => ev === 'message');
  if (!call) throw new Error('sseManager did not register a Redis message handler');
  messageHandler = call[1];
});

afterAll((done) => { httpServer.close(done); });

afterEach(() => {
  while (openReqs.length) openReqs.pop().destroy();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function openSSE() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const req = http.get(
      `http://127.0.0.1:${port}/api/v1/workshops/sse/seat-updates`,
      (res) => {
        res.on('data', (chunk) => chunks.push(chunk.toString()));
        resolve({ req, res, chunks });
      }
    );
    req.on('error', reject);
    openReqs.push(req);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Test suites ─────────────────────────────────────────────────────────────

describe('SSE /api/v1/workshops/sse/seat-updates – Connection', () => {
  it('responds with the required SSE headers', async () => {
    const { res } = await openSSE();

    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.headers['cache-control']).toMatch(/no-cache/);
    expect(res.headers['connection']).toMatch(/keep-alive/);
  });

  it('sends ": connected" comment as the first frame', async () => {
    const { chunks } = await openSSE();

    await wait(50);

    expect(chunks.join('')).toContain(': connected\n\n');
  });

  it('subscribes to the Redis seat_updates channel on first connect', () => {
    expect(redisSubscriber.subscribe).toHaveBeenCalledWith(
      'seat_updates',
      expect.any(Function)
    );
  });
});

describe('SSE /api/v1/workshops/sse/seat-updates – Broadcasting', () => {
  it('pushes a seat update to a connected client', async () => {
    const { chunks } = await openSSE();
    await wait(30);

    const update = { workshopId: 1, availableSeats: 49 };
    messageHandler('seat_updates', JSON.stringify(update));
    await wait(30);

    expect(chunks.join('')).toContain(`data: ${JSON.stringify(update)}\n\n`);
  });

  it('broadcasts the same update to every connected client', async () => {
    const a = await openSSE();
    const b = await openSSE();
    await wait(30);

    const update = { workshopId: 2, availableSeats: 20 };
    messageHandler('seat_updates', JSON.stringify(update));
    await wait(30);

    const payload = `data: ${JSON.stringify(update)}\n\n`;
    expect(a.chunks.join('')).toContain(payload);
    expect(b.chunks.join('')).toContain(payload);
  });

  it('delivers multiple sequential updates in order', async () => {
    const { chunks } = await openSSE();
    await wait(30);

    const updates = [
      { workshopId: 3, availableSeats: 30 },
      { workshopId: 3, availableSeats: 29 },
      { workshopId: 3, availableSeats: 28 },
    ];
    for (const u of updates) {
      messageHandler('seat_updates', JSON.stringify(u));
    }
    await wait(50);

    const received = chunks.join('');
    for (const u of updates) {
      expect(received).toContain(`data: ${JSON.stringify(u)}\n\n`);
    }
  });

  it('ignores messages published on unrelated Redis channels', async () => {
    const { chunks } = await openSSE();
    await wait(30);

    messageHandler('unrelated_channel', JSON.stringify({ workshopId: 4, availableSeats: 10 }));
    await wait(30);

    // Only the ": connected" SSE comment should be present — no data frame
    expect(chunks.join('')).not.toContain('data:');
  });
});

describe('SSE /api/v1/workshops/sse/seat-updates – Cleanup', () => {
  it('stops delivering updates to a disconnected client', async () => {
    const a = await openSSE();
    const b = await openSSE();
    await wait(30);

    // Disconnect client A
    a.req.destroy();
    openReqs.splice(openReqs.indexOf(a.req), 1);
    await wait(100); // server needs time to handle the close event

    const update = { workshopId: 5, availableSeats: 5 };
    messageHandler('seat_updates', JSON.stringify(update));
    await wait(30);

    const payload = `data: ${JSON.stringify(update)}\n\n`;

    // B receives the update; A's chunks did not grow after disconnect
    expect(b.chunks.join('')).toContain(payload);
    expect(a.chunks.join('')).not.toContain(payload);
  });

  it('keeps other clients active after one disconnects', async () => {
    const a = await openSSE();
    const b = await openSSE();
    const c = await openSSE();
    await wait(30);

    // Disconnect only B
    b.req.destroy();
    openReqs.splice(openReqs.indexOf(b.req), 1);
    await wait(100);

    const update = { workshopId: 6, availableSeats: 15 };
    messageHandler('seat_updates', JSON.stringify(update));
    await wait(30);

    const payload = `data: ${JSON.stringify(update)}\n\n`;
    expect(a.chunks.join('')).toContain(payload);
    expect(c.chunks.join('')).toContain(payload);
    expect(b.chunks.join('')).not.toContain(payload);
  });
});
