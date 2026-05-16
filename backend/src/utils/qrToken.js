/**
 * QR Token Utility — RS256 asymmetric signing for offline-verifiable check-in tickets.
 *
 * WHY RS256 over HS256:
 *   The mobile app must verify tokens completely offline (no network call).
 *   Sharing an HMAC secret with every mobile client is a critical security risk —
 *   any client that can verify can also forge tokens.
 *   With RS256, only the backend holds the private key (signs), while the mobile
 *   app holds only the public key (verifies). A leaked public key is harmless.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const QR_TOKEN_ALGORITHM = 'RS256';

/**
 * Reads a PEM key from an environment variable.
 * .env files store newlines as the literal two-character sequence \n,
 * so we unescape them back to real newlines that the crypto layer expects.
 *
 * @param {string} envVar - Name of the environment variable.
 * @returns {string} The PEM key string with real newlines.
 * @throws {Error} If the environment variable is not set.
 */
function _loadPemKey(envVar) {
  const raw = process.env[envVar];
  if (!raw) {
    throw new Error(
      `[qrToken] Missing required environment variable: ${envVar}. ` +
      'Generate a key pair with openssl and add it to your .env file.'
    );
  }
  // Unescape literal \n sequences that .env loaders preserve as-is.
  return raw.replace(/\\n/g, '\n');
}

/**
 * Signs a QR ticket payload using RS256 and the server's RSA private key.
 *
 * The resulting JWT is embedded inside the QR code image. The mobile app
 * verifies it offline using the corresponding public key — no network needed.
 *
 * @param {{ ticketId: number|string, studentId: number|string, workshopId: number|string }} ticketData
 * @returns {string} A signed JWT string.
 * @throws {Error} If the private key env var is missing or signing fails.
 */
function generateQrToken(ticketData) {
  const { ticketId, studentId, workshopId } = ticketData;

  if (ticketId == null || studentId == null || workshopId == null) {
    throw new Error(
      '[qrToken] generateQrToken requires ticketId, studentId, and workshopId.'
    );
  }

  const privateKey = _loadPemKey('QR_JWT_PRIVATE_KEY');
  const expiresIn = process.env.QR_JWT_EXPIRES_IN || '7d';

  const payload = {
    ticketId: String(ticketId),
    studentId: String(studentId),
    workshopId: String(workshopId),
  };

  return jwt.sign(payload, privateKey, {
    algorithm: QR_TOKEN_ALGORITHM,
    expiresIn,
    // jti (JWT ID) provides an extra unique identifier per token,
    // which the mobile app can use to detect replay attacks in its local DB.
    jwtid: crypto.randomUUID(),
  });
}

/**
 * Verifies a QR JWT using the server's RSA public key.
 *
 * The public key can be safely distributed to the mobile app and embedded
 * at build time — it cannot be used to forge tokens.
 *
 * @param {string} token - The JWT string read from the scanned QR code.
 * @returns {{ ticketId: string, studentId: string, workshopId: string, iat: number, exp: number, jti: string }}
 *   The decoded and verified payload.
 * @throws {jwt.TokenExpiredError} If the token's `exp` claim is in the past.
 * @throws {jwt.JsonWebTokenError} If the signature is invalid or the token is malformed.
 * @throws {Error} If the public key env var is missing.
 */
function verifyQrToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('[qrToken] verifyQrToken requires a non-empty token string.');
  }

  const publicKey = _loadPemKey('QR_JWT_PUBLIC_KEY');

  // Explicitly whitelist RS256 — prevents the "alg:none" attack and
  // the HS256 key-confusion attack where an attacker swaps to HMAC
  // and signs with the public key as the HMAC secret.
  return jwt.verify(token, publicKey, {
    algorithms: [QR_TOKEN_ALGORITHM],
  });
}

module.exports = { generateQrToken, verifyQrToken };
