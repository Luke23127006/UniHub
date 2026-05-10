/**
 * @param {string[]} allowedRoles - Roles permitted to access the route (e.g. ['Admin', 'Staff'])
 * @returns {import('express').RequestHandler}
 */
const requireRoles = (allowedRoles) => (req, res, next) => {
  const role = req.user?.role;

  if (allowedRoles.includes(role)) {
    return next();
  }

  return res.status(403).json({
    status: 'error',
    error: {
      code: 'FORBIDDEN',
      message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${role ?? 'unknown'}.`,
    },
  });
};

module.exports = requireRoles;
