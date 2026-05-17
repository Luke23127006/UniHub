const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

class TicketService {
  /**
   * Generates a signed JWT for a registration to be used as a QR code.
   * 
   * @param {number|bigint} registrationId 
   * @param {number|bigint} userId 
   * @returns {Promise<string>} Signed JWT
   */
  static async generateTicketJWT(registrationId, userId) {
    const regIdBig = BigInt(registrationId);
    const userIdBig = BigInt(userId);

    const registration = await prisma.registration.findFirst({
      where: {
        id: regIdBig,
        student: {
          user_id: userIdBig
        }
      },
      include: {
        student: true,
        workshop: true
      }
    });

    if (!registration) {
      throw Object.assign(new Error('Registration not found or does not belong to user'), { statusCode: 404 });
    }

    if (registration.status !== 'confirmed') {
      throw Object.assign(new Error('Ticket is not confirmed'), { statusCode: 400 });
    }

    const payload = {
      tid: registration.id.toString(),
      uid: userIdBig.toString(),
      wid: registration.workshop_id.toString(),
      iat: Math.floor(Date.now() / 1000)
    };

    // Use JWT_ACCESS_SECRET as the default secret for signing
    const secret = process.env.QR_SECRET || process.env.JWT_ACCESS_SECRET;
    
    return jwt.sign(payload, secret);
  }
}

module.exports = TicketService;
