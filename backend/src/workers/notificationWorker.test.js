// ── Mocks ─────────────────────────────────────────────────────────────────────
//
// jest.mock() calls are hoisted to the top of the file by Babel/Jest, so they
// always run before any require(). The factory functions here provide concrete
// mock structures instead of Jest's auto-mock, which cannot infer the shapes of
// dynamically-built Prisma clients or class constructors with guard logic.

jest.mock('../config/db', () => ({
  notificationEvent: {
    findUnique: jest.fn(),
    update:     jest.fn(),
  },
  notificationTemplate: {
    findFirst: jest.fn(),
  },
  notificationLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
}));

jest.mock('../utils/rabbitmq', () => ({
  consumeMessages: jest.fn(),
}));

jest.mock('../utils/templateEngine', () => ({
  compileTemplate: jest.fn(),
}));

// NotificationContext validates instanceof NotificationStrategy in its constructor.
// Mocking the module entirely bypasses that guard so we can inject a plain spy object.
jest.mock('../services/notification/NotificationContext');

// Strategies are mocked so no SMTP / FCM network calls occur.
jest.mock('../services/notification/strategies/EmailStrategy');
jest.mock('../services/notification/strategies/PushStrategy');

// ── Imports ───────────────────────────────────────────────────────────────────

const prisma                = require('../config/db');
const { consumeMessages }   = require('../utils/rabbitmq');
const { compileTemplate }   = require('../utils/templateEngine');
const NotificationContext   = require('../services/notification/NotificationContext');
const EmailStrategy         = require('../services/notification/strategies/EmailStrategy');
const PushStrategy          = require('../services/notification/strategies/PushStrategy');
const { startNotificationWorker } = require('./notificationWorker');

// ── Shared fixtures ───────────────────────────────────────────────────────────

const MOCK_USER = {
  id:        BigInt(1),
  email:     'student@uni.edu',
  full_name: 'Test Student',
};

const MOCK_EMAIL_TEMPLATE = {
  id:               BigInt(10),
  event_type:       'ticket.created.event',
  channel:          'email',
  subject_template: 'Your ticket for {{workshopName}}',
  body_template:    'Your QR token is {{qrToken}}.',
  is_active:        true,
};

const MOCK_APP_TEMPLATE = {
  ...MOCK_EMAIL_TEMPLATE,
  channel:          'app',
  subject_template: 'Ticket confirmed for {{workshopName}}',
};

const QUEUED_EVENT = {
  id:         BigInt(42),
  event_type: 'ticket.created.event',
  status:     'queued',
  payload:    JSON.stringify({ qrToken: 'QR-XYZ-999', workshopName: 'Systems Design 101' }),
  recipient:  MOCK_USER,
};

const ALREADY_SENT_EVENT = { ...QUEUED_EVENT, status: 'sent' };

// Compiled output values used throughout assertions
const COMPILED_SUBJECT = 'Your ticket for Systems Design 101';
const COMPILED_BODY    = 'Your QR token is QR-XYZ-999.';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calls startNotificationWorker() and returns the internal async callback
 * that was registered with consumeMessages.  Invoking it simulates a
 * RabbitMQ message being delivered to the worker.
 */
async function captureWorkerCallback() {
  let callback;
  consumeMessages.mockImplementationOnce(async (_queue, cb) => { callback = cb; });
  await startNotificationWorker();
  return callback;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('notificationWorker', () => {
  let mockNotify;

  beforeEach(() => {
    jest.clearAllMocks();

    // ── NotificationContext mock ──────────────────────────────────────────
    // Returns a plain object with a spy for notify so we can control
    // success vs failure per-test without touching real strategy code.
    mockNotify = jest.fn().mockResolvedValue({ messageId: 'mock-msg-id' });
    NotificationContext.mockImplementation(() => ({ notify: mockNotify }));

    // ── Prisma defaults (happy path) ──────────────────────────────────────
    prisma.notificationEvent.findUnique.mockResolvedValue(QUEUED_EVENT);
    prisma.notificationEvent.update.mockResolvedValue({});
    prisma.notificationTemplate.findFirst.mockResolvedValue(MOCK_EMAIL_TEMPLATE);
    prisma.notificationLog.create.mockResolvedValue({});
    prisma.$transaction.mockResolvedValue([{}, {}]);

    // ── compileTemplate defaults ──────────────────────────────────────────
    compileTemplate
      .mockReturnValueOnce(COMPILED_SUBJECT) // first call  → subject
      .mockReturnValueOnce(COMPILED_BODY);   // second call → body
  });

  // ── startNotificationWorker ─────────────────────────────────────────────

  describe('startNotificationWorker', () => {
    it('registers a consumer on the notification_queue', async () => {
      await captureWorkerCallback();
      expect(consumeMessages).toHaveBeenCalledWith('notification_queue', expect.any(Function));
    });
  });

  // ── Success path ────────────────────────────────────────────────────────

  describe('success case — valid queued event with email template', () => {
    let callback;

    beforeEach(async () => {
      callback = await captureWorkerCallback();
    });

    it('fetches the NotificationEvent and its recipient', async () => {
      await callback({ eventId: '42' });

      expect(prisma.notificationEvent.findUnique).toHaveBeenCalledWith({
        where:   { id: BigInt(42) },
        include: { recipient: { select: { id: true, email: true, full_name: true } } },
      });
    });

    it('marks the event as processing before dispatching', async () => {
      await callback({ eventId: '42' });

      expect(prisma.notificationEvent.update).toHaveBeenCalledWith({
        where: { id: BigInt(42) },
        data:  { status: 'processing' },
      });
    });

    it('fetches the active template matching the event_type', async () => {
      await callback({ eventId: '42' });

      expect(prisma.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: { event_type: 'ticket.created.event', is_active: true },
      });
    });

    it('compiles both subject and body templates with the event payload', async () => {
      await callback({ eventId: '42' });

      const payloadData = JSON.parse(QUEUED_EVENT.payload);
      expect(compileTemplate).toHaveBeenNthCalledWith(1, MOCK_EMAIL_TEMPLATE.subject_template, payloadData);
      expect(compileTemplate).toHaveBeenNthCalledWith(2, MOCK_EMAIL_TEMPLATE.body_template,    payloadData);
    });

    it('instantiates EmailStrategy for an email-channel template', async () => {
      await callback({ eventId: '42' });
      expect(EmailStrategy).toHaveBeenCalledTimes(1);
      expect(PushStrategy).not.toHaveBeenCalled();
    });

    it('calls notify with the recipient email and the compiled content', async () => {
      await callback({ eventId: '42' });

      expect(mockNotify).toHaveBeenCalledTimes(1);
      expect(mockNotify).toHaveBeenCalledWith(
        MOCK_USER.email,
        {
          subject:       COMPILED_SUBJECT,
          message:       COMPILED_BODY,
          recipientName: MOCK_USER.full_name,
        },
      );
    });

    it('updates the event status to sent inside a transaction', async () => {
      await callback({ eventId: '42' });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.notificationEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BigInt(42) },
          data:  expect.objectContaining({ status: 'sent' }),
        }),
      );
    });

    it('creates a NotificationLog record with status sent', async () => {
      await callback({ eventId: '42' });

      expect(prisma.notificationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            event_id:          BigInt(42),
            channel:           'email',
            recipient_address: MOCK_USER.email,
            status:            'sent',
          }),
        }),
      );
    });

    it('resolves without throwing (so consumeMessages will ack the message)', async () => {
      await expect(callback({ eventId: '42' })).resolves.toBeUndefined();
    });
  });

  // ── Failure path — strategy throws ─────────────────────────────────────

  describe('failure case — strategy throws (e.g. SMTP down)', () => {
    const SMTP_ERROR = new Error('connect ECONNREFUSED smtp.ethereal.email:587');
    let callback;

    beforeEach(async () => {
      mockNotify.mockRejectedValue(SMTP_ERROR);
      callback = await captureWorkerCallback();
    });

    it('updates the event status to failed inside a transaction', async () => {
      await callback({ eventId: '42' });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.notificationEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BigInt(42) },
          data:  expect.objectContaining({
            status:      'failed',
            retry_count: { increment: 1 },
          }),
        }),
      );
    });

    it('creates a NotificationLog record with status failed and the error message', async () => {
      await callback({ eventId: '42' });

      expect(prisma.notificationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            event_id:      BigInt(42),
            status:        'failed',
            error_message: SMTP_ERROR.message,
          }),
        }),
      );
    });

    it('does NOT create a sent log record', async () => {
      await callback({ eventId: '42' });

      const logCalls = prisma.notificationLog.create.mock.calls;
      logCalls.forEach(([args]) => {
        expect(args.data.status).not.toBe('sent');
      });
    });

    it('resolves without throwing so consumeMessages still acks the message', async () => {
      // This is the critical behaviour: even on failure the callback must not
      // throw, otherwise consumeMessages would nack and requeue the message
      // creating an infinite retry loop.
      await expect(callback({ eventId: '42' })).resolves.toBeUndefined();
    });
  });

  // ── Push / app channel ──────────────────────────────────────────────────

  describe('app-channel template routes to PushStrategy', () => {
    beforeEach(() => {
      // The outer beforeEach already queued two mockReturnValueOnce values for
      // the email path.  Reset the queue so only the app-specific values remain.
      compileTemplate.mockReset();
      compileTemplate
        .mockReturnValueOnce('Ticket confirmed for Systems Design 101')
        .mockReturnValueOnce('Scan your QR code at the entrance.');
    });

    it('instantiates PushStrategy and not EmailStrategy', async () => {
      prisma.notificationTemplate.findFirst.mockResolvedValue(MOCK_APP_TEMPLATE);
      const callback = await captureWorkerCallback();
      await callback({ eventId: '42' });

      expect(PushStrategy).toHaveBeenCalledTimes(1);
      expect(EmailStrategy).not.toHaveBeenCalled();
    });

    it('builds a { title, body } payload for push', async () => {
      prisma.notificationTemplate.findFirst.mockResolvedValue(MOCK_APP_TEMPLATE);
      const callback = await captureWorkerCallback();
      await callback({ eventId: '42' });

      expect(mockNotify).toHaveBeenCalledWith(
        `user:${MOCK_USER.id}`, // fallback when no deviceToken in payload
        {
          title: 'Ticket confirmed for Systems Design 101',
          body:  'Scan your QR code at the entrance.',
        },
      );
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('discards a message that has no eventId without querying the DB', async () => {
      const callback = await captureWorkerCallback();
      await callback({});  // no eventId field

      expect(prisma.notificationEvent.findUnique).not.toHaveBeenCalled();
    });

    it('skips processing and resolves cleanly for an already-sent event', async () => {
      prisma.notificationEvent.findUnique.mockResolvedValue(ALREADY_SENT_EVENT);
      const callback = await captureWorkerCallback();

      await expect(callback({ eventId: '42' })).resolves.toBeUndefined();

      expect(mockNotify).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('records a failed log when no active template exists for the event_type', async () => {
      prisma.notificationTemplate.findFirst.mockResolvedValue(null);
      const callback = await captureWorkerCallback();
      await callback({ eventId: '42' });

      // markFailed should be called — event stays as failed, ack is still sent
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.notificationEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
      );
      await expect(callback({ eventId: '42' })).resolves.toBeUndefined();
    });

    it('handles malformed JSON in event.payload gracefully', async () => {
      prisma.notificationEvent.findUnique.mockResolvedValue({
        ...QUEUED_EVENT,
        payload: '{ bad json }',
      });
      const callback = await captureWorkerCallback();
      await callback({ eventId: '42' });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.notificationEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
      );
    });
  });
});
