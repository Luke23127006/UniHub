'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock Prisma
jest.mock('../config/db', () => {
  const { mockDeep } = require('jest-mock-extended');
  return mockDeep();
});

const prisma = require('../../config/db');
const AuthService = require('../auth.service');

describe('AuthService.login', () => {
  const mockEmail = 'test@unihub.com';
  const mockPassword = 'password123';
  const mockHash = 'hashed_password';
  const mockUserId = BigInt(1);
  const mockRole = 'Student';

  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    password_hash: mockHash,
    full_name: 'Test User',
    is_active: true,
    user_roles: [
      {
        role: { name: mockRole }
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test_secret';
    // Mock console.error to keep logs clean
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should return user info and token for valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    jest.spyOn(jwt, 'sign').mockReturnValue('mock_token');
    prisma.user.update.mockResolvedValue({});

    const result = await AuthService.login(mockEmail, mockPassword);

    expect(result).toHaveProperty('accessToken', 'mock_token');
    expect(result.user).toMatchObject({
      email: mockEmail,
      role: mockRole
    });
  });

  it('should throw 401 if user is not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(AuthService.login(mockEmail, mockPassword))
      .rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
  });

  it('should throw 401 if user is inactive', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...mockUser, is_active: false });

    await expect(AuthService.login(mockEmail, mockPassword))
      .rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
  });

  it('should throw 401 if password_hash is missing', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...mockUser, password_hash: null });

    await expect(AuthService.login(mockEmail, mockPassword))
      .rejects.toMatchObject({ 
        statusCode: 401, 
        message: 'Password not set for this account. Please contact administrator.' 
      });
  });

  it('should throw 401 if password does not match', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    await expect(AuthService.login(mockEmail, mockPassword))
      .rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
  });

  it('should throw Error if JWT_ACCESS_SECRET is not configured', async () => {
    delete process.env.JWT_ACCESS_SECRET;
    prisma.user.findUnique.mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    await expect(AuthService.login(mockEmail, mockPassword))
      .rejects.toThrow('JWT_ACCESS_SECRET is not configured in environment');
  });
});
