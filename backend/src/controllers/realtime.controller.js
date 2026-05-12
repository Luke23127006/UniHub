const { redisSubscriber } = require('../config/redisPubSub');

// clientId -> { res, trackedWorkshopIds: number[] }
const activeClients = new Map();
let nextClientId = 1;

redisSubscriber.subscribe('seat_updates', (err) => {
  if (err) {
    console.error('[SSE] Failed to subscribe to seat_updates channel:', err);
  } else {
    console.log('[SSE] Subscribed to seat_updates channel');
  }
});

redisSubscriber.on('message', (channel, message) => {
  if (channel !== 'seat_updates') return;

  let payload;
  try {
    payload = JSON.parse(message);
  } catch (err) {
    console.error('[SSE] Failed to parse seat_updates message:', err);
    return;
  }

  const { workshopId, availableSeats } = payload;
  if (workshopId == null || availableSeats == null) return;

  const serialised = `data: ${JSON.stringify({ workshopId, availableSeats })}\n\n`;

  for (const [id, client] of activeClients) {
    if (client.trackedWorkshopIds.includes(workshopId)) {
      client.res.write(serialised);
    }
  }
});

function streamSeats(req, res) {
  const raw = req.query.ids ?? '';
  const trackedWorkshopIds = raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = nextClientId++;
  activeClients.set(clientId, { res, trackedWorkshopIds });

  req.on('close', () => {
    activeClients.delete(clientId);
  });
}

module.exports = { streamSeats };
