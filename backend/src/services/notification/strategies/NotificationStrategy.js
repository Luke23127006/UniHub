/**
 * Abstract base class for all notification strategies.
 * Concrete strategies must override `send`.
 */
class NotificationStrategy {
  /**
   * @param {string} recipient  — email address, device token, phone number, etc.
   * @param {object} payload    — notification-specific data (subject, body, templateVars, …)
   * @returns {Promise<object>} — strategy-specific result
   */
  async send(recipient, payload) {
    throw new Error(`${this.constructor.name} must implement send(recipient, payload)`);
  }
}

module.exports = NotificationStrategy;
