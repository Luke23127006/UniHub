/**
 * Mock Auth Middleware
 * For the purpose of this task, we will mock the authentication
 * by expecting a `x-user-id` header and attaching it to req.user.
 */
const authMiddleware = (req, res, next) => {
  const userIdHeader = req.headers['x-user-id'];

  if (!userIdHeader) {
    return res.status(401).json({ message: 'Unauthorized: Missing x-user-id header' });
  }

  const normalizedUserIdHeader = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
  const trimmedUserIdHeader = normalizedUserIdHeader.trim();

  if (!/^\d+$/.test(trimmedUserIdHeader)) {
    return res.status(401).json({ message: 'Unauthorized: Invalid user ID format' });
  }

  const userId = BigInt(trimmedUserIdHeader);

  // Mocking the user object
  req.user = {
    id: userId
  };

  next();
};

module.exports = authMiddleware;
