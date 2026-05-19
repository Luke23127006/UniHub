const jwt = require('jsonwebtoken');

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
  // Allow mock authentication in non-production for load testing (k6 uses x-user-id)
  if (process.env.NODE_ENV !== 'production' && req.headers['x-user-id']) {
    req.user = {
      sub: req.headers['x-user-id'],
      email: `student_${req.headers['x-user-id']}@unihub.edu.vn`,
      role: 'Student'
    };
    return next();
  }

  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[verifyToken] Missing or malformed token for ${req.method} ${req.url}`);
    return res.status(401).json({
      status: 'error',
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authorization header is missing or malformed. Expected: Bearer <token>',
      },
    });
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    console.error('[verifyToken] JWT_ACCESS_SECRET is not configured');
    return res.status(500).json({
      status: 'error',
      error: { code: 'SERVER_CONFIG_ERROR', message: 'Server configuration error' },
    });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (err) {
    console.warn(`[verifyToken] Invalid token: ${err.message}`);
    return res.status(401).json({
      status: 'error',
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token is invalid or expired',
      },
    });
  }
};

module.exports = verifyToken;
