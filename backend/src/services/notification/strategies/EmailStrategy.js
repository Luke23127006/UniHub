const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const NotificationStrategy = require('./NotificationStrategy');

// Compile once at module load; template vars: {{eventName}}, {{recipientName}}, {{message}}
const EMAIL_TEMPLATE = handlebars.compile(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #4f46e5; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 22px; }
    .body { padding: 24px 32px; color: #333; line-height: 1.6; }
    .footer { padding: 16px 32px; background: #f9fafb; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>UniHub — {{eventName}}</h1></div>
    <div class="body">
      <p>Hi {{recipientName}},</p>
      <p>{{message}}</p>
    </div>
    <div class="footer">You received this because you are registered on UniHub.</div>
  </div>
</body>
</html>
`);

/**
 * Creates a one-shot Ethereal transporter.
 * Ethereal credentials are ephemeral; each call to this function creates a fresh
 * test account so the module works without any SMTP configuration in .env.
 */
async function createEtherealTransporter() {
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

class EmailStrategy extends NotificationStrategy {
  /**
   * @param {object} [options]
   * @param {object} [options.transporter]  — inject a pre-built transporter (useful in tests)
   * @param {string} [options.from]         — sender address shown in the email
   */
  constructor(options = {}) {
    super();
    this._transporterOverride = options.transporter ?? null;
    this._from = options.from ?? '"UniHub" <no-reply@unihub.dev>';
  }

  /**
   * @param {string} recipient           — destination email address
   * @param {{ subject: string, recipientName?: string, eventName?: string, message: string }} payload
   */
  async send(recipient, payload) {
    const { subject, recipientName = 'Student', eventName = 'Event Update', message } = payload;

    if (!subject || !message) {
      throw new Error('EmailStrategy: payload must include `subject` and `message`');
    }

    const html = EMAIL_TEMPLATE({ recipientName, eventName, message });
    const transporter = this._transporterOverride ?? await createEtherealTransporter();

    const info = await transporter.sendMail({
      from: this._from,
      to: recipient,
      subject,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[EmailStrategy] Message sent to ${recipient} | Preview: ${previewUrl}`);

    return { messageId: info.messageId, previewUrl };
  }
}

module.exports = EmailStrategy;
