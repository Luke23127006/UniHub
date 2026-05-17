const { redisSubscriber } = require('./redisPubSub');

// Set of active SSE response objects
const clients = new Set();

let subscribed = false;

function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;

  redisSubscriber.subscribe('seat_updates', (err) => {
    if (err) console.error('[SSE] Failed to subscribe to seat_updates:', err);
    else console.log('[SSE] Subscribed to seat_updates channel');
  });

  redisSubscriber.on('message', (channel, message) => {
    if (channel !== 'seat_updates') return;
    const payload = `data: ${message}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch {
        clients.delete(res);
      }
    }
  });
}

function addClient(res) {
  ensureSubscribed();
  clients.add(res);
}

function removeClient(res) {
  clients.delete(res);
}

module.exports = { addClient, removeClient };
