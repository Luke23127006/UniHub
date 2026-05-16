const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
  /**
   * Authenticates a user and returns a JWT token.
   * 
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{ user: object, accessToken: string }>}
   */
  static async login(email, password) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        user_roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user || !user.is_active) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    // Note: In a real system, we'd always have a hash. 
    // If password_hash is null (e.g. seeded users), we deny login for security.
    if (!user.password_hash) {
      throw Object.assign(new Error('Password not set for this account. Please contact administrator.'), { statusCode: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    // Extract role - for simplicity, we take the first role. 
    // In UniHub, a user typically has one primary role (Student, Staff, or Admin).
    const roleName = user.user_roles.length > 0 ? user.user_roles[0].role.name : 'Student';

    const accessToken = this.generateAccessToken(user, roleName);

    // Update last login timestamp asynchronously
    prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() }
    }).catch(err => console.error('[AuthService] Failed to update last_login_at:', err.message));

    return {
      user: {
        id: user.id.toString(),
        email: user.email,
        full_name: user.full_name,
        role: roleName
      },
      accessToken
    };
  }

  /**
   * Generates a signed JWT access token.
   * 
   * @param {object} user 
   * @param {string} role 
   * @returns {string}
   */
  static generateAccessToken(user, role) {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured in environment');
    }

    return jwt.sign(
      {
        sub: user.id.toString(),
        email: user.email,
        role: role
      },
      secret,
      { expiresIn: '1d' }
    );
  }
}

module.exports = AuthService;
