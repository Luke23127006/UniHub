const crypto = require('crypto');
const redisClient = require('../config/redis');

// Atomically release the lock only when the stored value matches the caller's token.
// Without this check, worker A can delete worker B's lock after A's TTL has expired
// and B has already re-acquired (classic ABA problem).
const RELEASE_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

class RedisLock {
  /**
   * Acquires a distributed lock using SET NX PX with a per-call unique token.
   *
   * Returns the token string on success so the caller can pass it to releaseLock().
   * Returns null if the lock is already held by another worker.
   *
   * @param {string} key   Lock key (e.g. "lock:workshop:123")
   * @param {number} ttlMs Expiry in ms — must be >= worst-case processing time
   * @returns {Promise<string|null>}
   */
  static async acquireLock(key, ttlMs = 30000) {
    const token = crypto.randomBytes(16).toString('hex');
    try {
      const result = await redisClient.set(key, token, 'NX', 'PX', ttlMs);
      return result === 'OK' ? token : null;
    } catch (error) {
      console.error(`Error acquiring Redis lock for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Releases the lock using an atomic Lua check-and-delete.
   * The key is only deleted when its stored value matches `token`, so a worker
   * that ran past the TTL cannot accidentally release a lock it no longer owns.
   *
   * @param {string} key   Lock key
   * @param {string} token Token returned by acquireLock()
   */
  static async releaseLock(key, token) {
    if (!token) return;
    try {
      // ioredis: eval(script, numkeys, key1, arg1)
      await redisClient.eval(RELEASE_SCRIPT, 1, key, token);
    } catch (error) {
      console.error(`Error releasing Redis lock for key ${key}:`, error);
    }
  }
}

module.exports = RedisLock;
