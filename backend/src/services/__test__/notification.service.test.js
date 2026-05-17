// ── Mocks must be declared before any require() calls ────────────────────────

jest.mock('../../config/db', () => ({
  notificationEvent: {
    create: jest.fn(),
  },
}));

jest.mock('../../utils/rabbitmq', () => ({
  publishMessage: jest.fn(),
}));

// ── Imports (resolved against the mocks above) ────────────────────────────────

const prisma          = require('../../config/db');
const { publishMessage } = require('../../utils/rabbitmq');
const { queueNotification } = require('../notification/notification.service');

// ── Shared fixtures ───────────────────────────────────────────────────────────

const USER_ID         = 42;
const EVENT_TYPE      = 'ticket.created.event';
const ENTITY_TYPE     = 'registration';
const ENTITY_ID       = 99;
const PAYLOAD         = { qrToken: 'QR-ABC-123', workshopName: 'Systems Design 101' };
const MOCK_EVENT_ID   = BigInt(1);

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default happy-path: DB returns a new event with id = 1n
  prisma.notificationEvent.create.mockResolvedValue({ id: MOCK_EVENT_ID });
  publishMessage.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('queueNotification', () => {
  describe('DB persistence', () => {
    it('calls notificationEvent.create with status queued and the correct fields', async () => {
      await queueNotification(USER_ID, EVENT_TYPE, ENTITY_TYPE, ENTITY_ID, PAYLOAD);

      expect(prisma.notificationEvent.create).toHaveBeenCalledTimes(1);
      expect(prisma.notificationEvent.create).toHaveBeenCalledWith({
        data: {
          event_type:          EVENT_TYPE,
          recipient_user_id:   BigInt(USER_ID),
          related_entity_type: ENTITY_TYPE,
          related_entity_id:   BigInt(ENTITY_ID),
          payload:             JSON.stringify(PAYLOAD),
          status:              'queued',
        },
        select: { id: true },
      });
    });

    it('stores payload as a JSON string (not the raw object)', async () => {
      await queueNotification(USER_ID, EVENT_TYPE, null, null, PAYLOAD);

      const { data } = prisma.notificationEvent.create.mock.calls[0][0];
      expect(typeof data.payload).toBe('string');
      expect(JSON.parse(data.payload)).toEqual(PAYLOAD);
    });

    it('stores null when payload is null', async () => {
      await queueNotification(USER_ID, EVENT_TYPE, null, null, null);

      const { data } = prisma.notificationEvent.create.mock.calls[0][0];
      expect(data.payload).toBeNull();
    });

    it('stores null for related_entity_id when not provided', async () => {
      await queueNotification(USER_ID, EVENT_TYPE, null, null, null);

      const { data } = prisma.notificationEvent.create.mock.calls[0][0];
      expect(data.related_entity_id).toBeNull();
      expect(data.related_entity_type).toBeNull();
    });

    it('converts userId to BigInt', async () => {
      await queueNotification('99', EVENT_TYPE, null, null, null);

      const { data } = prisma.notificationEvent.create.mock.calls[0][0];
      expect(data.recipient_user_id).toBe(BigInt(99));
    });
  });

  describe('RabbitMQ publishing', () => {
    it('calls publishMessage with the notification_queue and the event id as a string', async () => {
      await queueNotification(USER_ID, EVENT_TYPE, ENTITY_TYPE, ENTITY_ID, PAYLOAD);

      expect(publishMessage).toHaveBeenCalledTimes(1);
      expect(publishMessage).toHaveBeenCalledWith(
        'notification_queue',
        { eventId: MOCK_EVENT_ID.toString() }, // BigInt → "1", not the number 1
      );
    });

    it('publishes AFTER the DB write (outbox safety order)', async () => {
      const order = [];
      prisma.notificationEvent.create.mockImplementation(async () => {
        order.push('db');
        return { id: MOCK_EVENT_ID };
      });
      publishMessage.mockImplementation(async () => { order.push('publish'); });

      await queueNotification(USER_ID, EVENT_TYPE, null, null, null);

      expect(order).toEqual(['db', 'publish']);
    });
  });

  describe('return value', () => {
    it('returns the BigInt id of the created event', async () => {
      const result = await queueNotification(USER_ID, EVENT_TYPE, null, null, null);
      expect(result).toBe(MOCK_EVENT_ID);
    });
  });

  describe('error propagation', () => {
    it('propagates a DB error without calling publishMessage', async () => {
      prisma.notificationEvent.create.mockRejectedValue(new Error('DB connection lost'));

      await expect(
        queueNotification(USER_ID, EVENT_TYPE, null, null, null),
      ).rejects.toThrow('DB connection lost');

      expect(publishMessage).not.toHaveBeenCalled();
    });

    it('propagates a broker error after the DB write succeeds', async () => {
      publishMessage.mockRejectedValue(new Error('RabbitMQ unreachable'));

      await expect(
        queueNotification(USER_ID, EVENT_TYPE, null, null, null),
      ).rejects.toThrow('RabbitMQ unreachable');

      // DB row was already created — it stays at 'queued' for recovery
      expect(prisma.notificationEvent.create).toHaveBeenCalledTimes(1);
    });
  });
});
