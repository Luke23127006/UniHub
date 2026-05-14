const jwt = require('jsonwebtoken');

/**
 * @typedef {Object} JwtPayload
 * @property {string} sub   - User ID
 * @property {string} email
 * @property {string} role  - "Student" | "Staff" | "Admin"
 * @property {number} iat
 * @property {number} exp
 */

/**
 * Tier-1 Authentication Middleware.
 *
 * Verifies the Bearer JWT in the Authorization header, then attaches the
 * decoded payload to `req.user` so downstream middlewares and controllers
 * can read `req.user.sub`, `req.user.email`, and `req.user.role`.
 *
 * @type {import('express').RequestHandler}
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authorization header is missing or malformed. Expected: Bearer <token>',
      },
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    // Fail loudly in development; this is a configuration error, not a client error.
    console.error('[verifyToken] JWT_ACCESS_SECRET is not set in environment variables.');
    return res.status(500).json({
      status: 'error',
      error: { code: 'SERVER_MISCONFIGURATION', message: 'Internal server error.' },
    });
  }

  try {
    /** @type {JwtPayload} */
    const decoded = jwt.verify(token, secret);

    const VALID_ROLES = ['Student', 'Staff', 'Admin'];
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof decoded.sub !== 'string' ||
      typeof decoded.email !== 'string' ||
      !VALID_ROLES.includes(decoded.role)
    ) {
      return res.status(401).json({
        status: 'error',
        error: { code: 'INVALID_TOKEN', message: 'Token payload is malformed.' },
      });
    }

    req.user = decoded;
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        status: 'error',
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired. Please use your Refresh Token to obtain a new one.',
        },
      });
    }

    // Covers JsonWebTokenError (bad signature, malformed) and NotBeforeError
    return res.status(401).json({
      status: 'error',
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token signature is invalid or the token has been tampered with.',
      },
    });
  }
};

module.exports = verifyToken;
