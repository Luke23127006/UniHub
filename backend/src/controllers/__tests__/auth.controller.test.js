'use strict';

const AuthController = require('../auth.controller');
const AuthService = require('../../services/auth.service');

jest.mock('../../services/auth.service');

describe('AuthController.login', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {
        email: 'test@unihub.com',
        password: 'password123'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  it('should return 200 and data on successful login', async () => {
    const mockResult = { user: { id: '1' }, accessToken: 'token' };
    AuthService.login.mockResolvedValue(mockResult);

    await AuthController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: mockResult
    });
  });

  it('should return 400 if email or password is missing', async () => {
    req.body = { email: 'test@unihub.com' }; 

    await AuthController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      error: expect.objectContaining({ code: 'MISSING_CREDENTIALS' })
    }));
  });

  it('should return 401 if AuthService throws unauthorized error', async () => {
    const authError = new Error('Invalid credentials');
    authError.statusCode = 401;
    AuthService.login.mockRejectedValue(authError);

    await AuthController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials'
      }
    });
  });

  it('should return 500 for unexpected errors', async () => {
    AuthService.login.mockRejectedValue(new Error('DB Error'));

    await AuthController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error'
    }));
  });
});
