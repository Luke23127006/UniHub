'use strict';

const PaymentController = require('../payment.controller');
const { RegistrationService } = require('../../services/registration.service');
const paymentService = require('../../services/payment.service');

// Mock dependencies
jest.mock('../../services/registration.service', () => ({
  RegistrationService: {
    confirmRegistration: jest.fn()
  }
}));

jest.mock('../../services/payment.service', () => ({
  verifyPayment: jest.fn()
}));

describe('PaymentController.confirmPayment', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { id: '123' },
      user: { sub: 1n } // Mock student user
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('should return 400 if registration ID is missing', async () => {
    req.params.id = undefined;
    await PaymentController.confirmPayment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Registration ID is required' });
  });

  it('should return 402 if payment verification fails at gateway', async () => {
    paymentService.verifyPayment.mockResolvedValue({ success: false });

    await PaymentController.confirmPayment(req, res);

    expect(paymentService.verifyPayment).toHaveBeenCalledWith('123');
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.stringContaining('failed at gateway')
    }));
  });

  it('should confirm registration and return 200 on success', async () => {
    paymentService.verifyPayment.mockResolvedValue({ success: true });
    RegistrationService.confirmRegistration.mockResolvedValue({
      id: 123n,
      status: 'confirmed'
    });

    await PaymentController.confirmPayment(req, res);

    expect(RegistrationService.confirmRegistration).toHaveBeenCalledWith('123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Payment confirmed and ticket issued.',
      ticket_id: '123',
      status: 'confirmed'
    });
  });

  it('should return 503 if payment gateway circuit is open', async () => {
    const circuitError = new Error('Circuit Open');
    circuitError.name = 'CircuitOpenError';
    paymentService.verifyPayment.mockRejectedValue(circuitError);

    await PaymentController.confirmPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('temporarily unavailable')
    }));
  });

  it('should return 404 if registration is not found in DB during confirmation', async () => {
    paymentService.verifyPayment.mockResolvedValue({ success: true });
    const error = new Error('Registration not found');
    error.statusCode = 404;
    RegistrationService.confirmRegistration.mockRejectedValue(error);

    await PaymentController.confirmPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Registration not found' });
  });
});
