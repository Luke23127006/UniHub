const NotificationStrategy = require('./strategies/NotificationStrategy');

class NotificationContext {
  /**
   * @param {NotificationStrategy} strategy
   */
  constructor(strategy) {
    if (!(strategy instanceof NotificationStrategy)) {
      throw new TypeError('NotificationContext: strategy must extend NotificationStrategy');
    }
    this._strategy = strategy;
  }

  /**
   * Swaps the active strategy at runtime.
   * @param {NotificationStrategy} strategy
   */
  setStrategy(strategy) {
    if (!(strategy instanceof NotificationStrategy)) {
      throw new TypeError('NotificationContext: strategy must extend NotificationStrategy');
    }
    this._strategy = strategy;
  }

  /**
   * Dispatches the notification through the current strategy.
   *
   * @param {string} recipient
   * @param {object} payload
   * @returns {Promise<object>} result from the strategy
   */
  async notify(recipient, payload) {
    if (!recipient) throw new Error('NotificationContext: recipient is required');
    return this._strategy.send(recipient, payload);
  }
}

module.exports = NotificationContext;
