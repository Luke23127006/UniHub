'use strict';

/**
 * Unit tests for PaymentService.
 * Uses global.fetch mock to simulate gateway responses.
 */

// Mock fetch globally
global.fetch = jest.fn();

const { initiatePayment, verifyPayment, isCircuitOpen } = require('../payment.service');

const REGISTRATION_ID = '99';
const AMOUNT = 50000;
const GATEWAY_URL = process.env.MOCK_PAYMENT_GATEWAY_URL || 'http://localhost:4000';

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initiatePayment', () => {
    it('returns a payment URL on success', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ paymentUrl: 'http://gateway.com/pay/99' })
      });

      const result = await initiatePayment(REGISTRATION_ID, AMOUNT);
      expect(result.paymentUrl).toBe('http://gateway.com/pay/99');
      expect(global.fetch).toHaveBeenCalledWith(
        `${GATEWAY_URL}/payments/initiate`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ registrationId: REGISTRATION_ID, amount: AMOUNT.toString() })
        })
      );
    });

    it('throws error if gateway responds with non-OK status', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(initiatePayment(REGISTRATION_ID, AMOUNT)).rejects.toThrow('Mock gateway responded with HTTP 500');
    });
  });

  describe('verifyPayment', () => {
    it('returns success: true when gateway confirms payment', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await verifyPayment(REGISTRATION_ID);
      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        `${GATEWAY_URL}/payments/verify/${REGISTRATION_ID}`,
        expect.objectContaining({ signal: expect.any(Object) })
      );
    });

    it('returns success: false when gateway denies or fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await verifyPayment(REGISTRATION_ID);
      expect(result).toEqual({ success: false });
    });

    it('returns success: false on network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await verifyPayment(REGISTRATION_ID);
      expect(result).toEqual({ success: false });
    });
  });
});
