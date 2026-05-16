const NotificationStrategy = require('./NotificationStrategy');

class PushStrategy extends NotificationStrategy {
  /**
   * @param {string} recipient  — FCM device token
   * @param {{ title: string, body: string, data?: object }} payload
   */
  async send(recipient, payload) {
    const { title, body, data = {} } = payload;

    if (!title || !body) {
      throw new Error('PushStrategy: payload must include `title` and `body`');
    }

    // Simulates the FCM HTTP v1 request payload structure
    const fcmPayload = {
      message: {
        token: recipient,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
      },
    };

    console.log('[PushStrategy] FCM push dispatched:', JSON.stringify(fcmPayload, null, 2));

    return {
      success: true,
      fcmMessageId: `mock-fcm-${Date.now()}`,
      recipient,
    };
  }
}

module.exports = PushStrategy;
