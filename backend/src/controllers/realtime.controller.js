const { redisSubscriber } = require('../config/redisPubSub');
const prisma = require('../config/db');

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
    .map((s) => s.trim())
    .filter((s) => /^[1-9]\d*$/.test(s))
    .map(Number);

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

async function getSeatsBatch(req, res) {
  const raw = req.query.ids ?? '';
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[1-9]\d*$/.test(s));

  if (ids.length === 0) {
    return res.status(400).json({ message: 'Query parameter "ids" must be a non-empty comma-separated list of workshop IDs.' });
  }

  try {
    const workshops = await prisma.workshop.findMany({
      where: { id: { in: ids.map(BigInt) } },
      select: { id: true, available_seats: true },
    });

    const seats = Object.fromEntries(
      workshops.map((w) => [w.id.toString(), w.available_seats])
    );

    return res.status(200).json(seats);
  } catch (err) {
    console.error('[RealtimeController] getSeatsBatch error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { streamSeats, getSeatsBatch };
