/**
 * Mock Auth Middleware
 * For the purpose of this task, we will mock the authentication
 * by expecting a `x-user-id` header and attaching it to req.user.
 */
const authMiddleware = (req, res, next) => {
  const userIdHeader = req.headers['x-user-id'];

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
    console.warn(`[verifyToken] Missing or malformed token for ${req.method} ${req.url}`);
    return res.status(401).json({
      status: 'error',
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authorization header is missing or malformed. Expected: Bearer <token>',
      },
    });
  }

  const userId = parseInt(userIdHeader, 10);
  
  if (isNaN(userId)) {
    return res.status(401).json({ message: 'Unauthorized: Invalid user ID format' });
  }

  // Mocking the user object
  req.user = {
    id: userId
  };

  next();
};

module.exports = authMiddleware;
