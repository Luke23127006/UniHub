const redisClient = require('../config/redis');

class RedisLock {
  /**
   * Acquires a distributed lock using Redis SET NX PX
   * @param {string} key - The lock key (e.g. lock:workshop:123)
   * @param {number} ttlMs - Time to live in milliseconds (expiration to prevent deadlocks)
   * @returns {Promise<boolean>} - True if lock acquired, false otherwise
   */
  static async acquireLock(key, ttlMs = 5000) {
    try {
      // SET key value NX PX ttl
      // NX: Only set the key if it does not already exist
      // PX: Set the specified expire time, in milliseconds
      const result = await redisClient.set(key, 'locked', 'NX', 'PX', ttlMs);
      return result === 'OK';
    } catch (error) {
      console.error(`Error acquiring Redis lock for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Releases a distributed lock by deleting the key
   * @param {string} key - The lock key to release
   */
  static async releaseLock(key) {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error(`Error releasing Redis lock for key ${key}:`, error);
    }
  }
}

module.exports = RedisLock;
