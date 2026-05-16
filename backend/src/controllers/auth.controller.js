const prisma = require('../config/db');
const AuthService = require('../services/auth.service');

class AuthController {
  /**
   * Handles user login request.
   * 
   * @param {import('express').Request} req 
   * @param {import('express').Response} res 
   */
  static async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email and password are required.'
        }
      });
    }

    try {
      const result = await AuthService.login(email, password);
      
      return res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        status: 'error',
        error: {
          code: statusCode === 401 ? 'UNAUTHORIZED' : 'AUTH_ERROR',
          message: error.message
        }
      });
    }
  }

  static async getMe(req, res) {
    try {
      const { sub } = req.user;
      const user = await prisma.user.findUnique({
        where: { id: BigInt(sub) },
        include: { user_roles: { include: { role: true } } }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user.id.toString(),
        email: user.email,
        full_name: user.full_name,
        role: user.user_roles[0]?.role.name || 'Student'
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = AuthController;
