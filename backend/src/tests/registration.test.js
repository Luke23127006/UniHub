const request = require('supertest');
const express = require('express');
const RegistrationController = require('../controllers/registrationController');
const { RegistrationService } = require('../services/registration.service');

// Giả lập RegistrationService để không cần Database thật
jest.mock('../services/registration.service');

const app = express();
app.use(express.json());

// Mock Middleware Authentication
const mockAuth = (req, res, next) => {
  req.user = { sub: 'user-123' }; // Giả lập user đã login
  next();
};

// Route cần test
app.post('/v1/registration', mockAuth, RegistrationController.registerSynchronous);

describe('Registration API Flow (Backend)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('SHOULD return 201 when registration is successful', async () => {
    // 1. Chuẩn bị dữ liệu giả lập từ Service
    RegistrationService.registerForWorkshop.mockResolvedValue({
      registrationId: 'reg-999',
      paymentUrl: 'https://payment.gateway/pay',
      outcome: 'PENDING_PAYMENT'
    });

    // 2. Gửi request giả lập qua supertest
    const response = await request(app)
      .post('/v1/registration')
      .send({ workshopId: 'workshop-1' });

    // 3. Kiểm tra kết quả
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      message: 'Registration request processed.',
      registrationId: 'reg-999',
      paymentUrl: 'https://payment.gateway/pay'
    });
    
    // Đảm bảo Service được gọi đúng tham số
    expect(RegistrationService.registerForWorkshop).toHaveBeenCalledWith('workshop-1', 'user-123');
  });

  it('SHOULD return 400 when workshopId is missing', async () => {
    const response = await request(app)
      .post('/v1/registration')
      .send({}); // Không gửi workshopId

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Workshop ID is required');
  });

  it('SHOULD return 500 when service throws an error', async () => {
    RegistrationService.registerForWorkshop.mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app)
      .post('/v1/registration')
      .send({ workshopId: 'workshop-1' });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Database connection failed');
  });
});
