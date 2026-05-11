const prisma = require('../config/db');

/**
 * Tier-3 Data-Segregation Middleware (IDOR prevention).
 *
 * Guards student-owned resources so that one student cannot access
 * another student's data even with a valid token and the correct role.
 *
 * Expects:
 *   - req.user.sub  : string  — user ID from the JWT (set by verifyToken)
 *   - req.params.id : string  — registration/ticket ID from the URL
 *
 * Returns 404 when the resource does not exist (avoids leaking existence),
 * and 403 when the resource belongs to a different user.
 *
 * @type {import('express').RequestHandler}
 */
const verifyOwner = async (req, res, next) => {
  // Validate before conversion: BigInt('') === 0n in Node.js — it does not throw.
  // We require a non-empty string of digits representing a positive integer.
  if (!/^\d+$/.test(req.params.id) || req.params.id === '0') {
    return res.status(400).json({
      status: 'error',
      error: { code: 'INVALID_ID', message: 'Resource ID is invalid.' },
    });
  }

  let registration;
  try {
    const registrationId = BigInt(req.params.id);
    registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: { student: { select: { user_id: true } } },
    });
  } catch {
    return res.status(500).json({
      status: 'error',
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    });
  }

  // 404 — hide existence from callers who do not own the resource
  if (!registration) {
    return res.status(404).json({
      status: 'error',
      error: { code: 'NOT_FOUND', message: 'Resource not found.' },
    });
  }

  // sub is a string in the JWT; Prisma returns BigInt for DB columns
  const requestorId = BigInt(req.user.sub);
  const ownerId = registration.student.user_id;

  if (requestorId !== ownerId) {
    return res.status(403).json({
      status: 'error',
      error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' },
    });
  }

  return next();
};

module.exports = verifyOwner;
