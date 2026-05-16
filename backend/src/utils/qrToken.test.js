'use strict';

/**
 * Unit tests for src/utils/qrToken.js
 *
 * Isolation strategy:
 *   - A real RSA-2048 key pair is generated in memory via Node's `crypto` module
 *     inside `beforeAll`. No .env file, no openssl binary, no network required.
 *   - The keys are stored in `process.env` in the same escaped-newline format
 *     that dotenv produces (real \n → literal \\n), which exercises the exact
 *     `_loadPemKey` unescape path used in production.
 *   - Original env values are snapshotted before and fully restored in `afterAll`
 *     so this suite does not bleed state into other test files.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { generateQrToken, verifyQrToken } = require('./qrToken');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_TICKET = { ticketId: 42, studentId: 7, workshopId: 3 };

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Escapes real newlines to literal \\n, mirroring how dotenv stores
 * multi-line PEM blocks in a .env file.
 */
const toDotenvFormat = (pem) => pem.replace(/\n/g, '\\n');

/**
 * Replaces the entire JWT signature segment with an all-zero byte sequence.
 *
 * WHY full replacement instead of a single character flip:
 *   An RSA-2048 signature is 256 bytes → 342 base64url characters.
 *   The last base64url character only carries 2 significant bits (4 are
 *   padding zeros). Flipping that character (e.g., 'A'→'B') changes only the
 *   padding bits, so the decoded bytes are identical and verification still
 *   passes. Replacing the whole signature with 'A'.repeat(length) (all zeros)
 *   is guaranteed to be an invalid RSA-PKCS1-v1.5 signature for any key.
 */
function tamperSignature(token) {
  const parts = token.split('.');
  parts[2] = 'A'.repeat(parts[2].length);
  return parts.join('.');
}

/**
 * Tampers with the JWT payload by decoding it, modifying a field, and
 * re-encoding it — without re-signing. This always produces structurally
 * valid JSON, so jwt.verify reaches signature verification and throws
 * JsonWebTokenError rather than a JSON SyntaxError.
 */
function tamperPayload(token) {
  const parts = token.split('.');
  const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  decoded.ticketId = String(Number(decoded.ticketId) + 9999);
  parts[1] = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
  return parts.join('.');
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('qrToken utility', () => {
  // Snapshot env before the suite so afterAll can restore exactly.
  const _originalPrivateKey = process.env.QR_JWT_PRIVATE_KEY;
  const _originalPublicKey = process.env.QR_JWT_PUBLIC_KEY;
  const _originalExpiresIn = process.env.QR_JWT_EXPIRES_IN;

  beforeAll(() => {
    // Generate a real RSA-2048 key pair entirely in memory — no file I/O needed.
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Store in the same \\n-escaped format that dotenv produces, so the test
    // exercises the _loadPemKey() unescape logic rather than bypassing it.
    process.env.QR_JWT_PRIVATE_KEY = toDotenvFormat(privateKey);
    process.env.QR_JWT_PUBLIC_KEY = toDotenvFormat(publicKey);
    process.env.QR_JWT_EXPIRES_IN = '7d';
  });

  afterAll(() => {
    // Restore original state — don't bleed into other test suites.
    if (_originalPrivateKey === undefined) {
      delete process.env.QR_JWT_PRIVATE_KEY;
    } else {
      process.env.QR_JWT_PRIVATE_KEY = _originalPrivateKey;
    }

    if (_originalPublicKey === undefined) {
      delete process.env.QR_JWT_PUBLIC_KEY;
    } else {
      process.env.QR_JWT_PUBLIC_KEY = _originalPublicKey;
    }

    if (_originalExpiresIn === undefined) {
      delete process.env.QR_JWT_EXPIRES_IN;
    } else {
      process.env.QR_JWT_EXPIRES_IN = _originalExpiresIn;
    }
  });

  // ==========================================================================
  // generateQrToken
  // ==========================================================================

  describe('generateQrToken', () => {
    describe('when called with a valid payload', () => {
      let token;

      beforeAll(() => {
        token = generateQrToken(VALID_TICKET);
      });

      it('returns a non-empty string', () => {
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
      });

      it('returns a three-segment JWT (header.payload.signature)', () => {
        const parts = token.split('.');
        expect(parts).toHaveLength(3);
        // Each segment must be a non-empty base64url string.
        parts.forEach((part) => expect(part.length).toBeGreaterThan(0));
      });

      it('encodes ticketId, studentId, and workshopId as strings in the payload', () => {
        const decoded = jwt.decode(token);
        expect(decoded.ticketId).toBe(String(VALID_TICKET.ticketId));
        expect(decoded.studentId).toBe(String(VALID_TICKET.studentId));
        expect(decoded.workshopId).toBe(String(VALID_TICKET.workshopId));
      });

      it('includes a jti claim (replay-attack anchor for the mobile local DB)', () => {
        const decoded = jwt.decode(token);
        expect(decoded.jti).toBeDefined();
        expect(typeof decoded.jti).toBe('string');
      });

      it('sets expiry approximately 7 days from now', () => {
        const decoded = jwt.decode(token);
        const sevenDaysInSeconds = 7 * 24 * 60 * 60;
        const delta = decoded.exp - decoded.iat;
        // Allow a ±5 second tolerance for test execution time.
        expect(delta).toBeGreaterThanOrEqual(sevenDaysInSeconds - 5);
        expect(delta).toBeLessThanOrEqual(sevenDaysInSeconds + 5);
      });

      it('uses RS256 as the signing algorithm', () => {
        // jwt.decode with { complete: true } returns the header.
        const { header } = jwt.decode(token, { complete: true });
        expect(header.alg).toBe('RS256');
      });

      it('produces a unique jti on each call to prevent token collisions', () => {
        const second = generateQrToken(VALID_TICKET);
        const decodedFirst = jwt.decode(token);
        const decodedSecond = jwt.decode(second);
        expect(decodedFirst.jti).not.toBe(decodedSecond.jti);
      });
    });

    // ── Missing payload fields ────────────────────────────────────────────────

    describe('when required payload fields are missing', () => {
      it('throws when ticketId is absent', () => {
        expect(() =>
          generateQrToken({ studentId: 7, workshopId: 3 }),
        ).toThrow('[qrToken] generateQrToken requires ticketId, studentId, and workshopId.');
      });

      it('throws when studentId is absent', () => {
        expect(() =>
          generateQrToken({ ticketId: 42, workshopId: 3 }),
        ).toThrow('[qrToken] generateQrToken requires ticketId, studentId, and workshopId.');
      });

      it('throws when workshopId is absent', () => {
        expect(() =>
          generateQrToken({ ticketId: 42, studentId: 7 }),
        ).toThrow('[qrToken] generateQrToken requires ticketId, studentId, and workshopId.');
      });
    });

    // ── Missing environment variable ──────────────────────────────────────────

    describe('when QR_JWT_PRIVATE_KEY env var is not set', () => {
      let _saved;

      beforeEach(() => {
        _saved = process.env.QR_JWT_PRIVATE_KEY;
        delete process.env.QR_JWT_PRIVATE_KEY;
      });

      afterEach(() => {
        // Restore the EXACT original key so QR_JWT_PRIVATE_KEY and QR_JWT_PUBLIC_KEY
        // stay matched for every test that follows this describe block.
        process.env.QR_JWT_PRIVATE_KEY = _saved;
      });

      it('throws an error that names the missing variable', () => {
        expect(() => generateQrToken(VALID_TICKET)).toThrow('QR_JWT_PRIVATE_KEY');
      });

      it('throws an error that guides the developer to fix it', () => {
        expect(() => generateQrToken(VALID_TICKET)).toThrow(
          /Missing required environment variable/,
        );
      });
    });
  });

  // ==========================================================================
  // verifyQrToken
  // ==========================================================================

  describe('verifyQrToken', () => {
    // One valid token shared across the success / tampering tests.
    let validToken;

    beforeAll(() => {
      validToken = generateQrToken(VALID_TICKET);
    });

    // ── Round-trip (happy path) ───────────────────────────────────────────────

    describe('when given a valid, unmodified token', () => {
      let decoded;

      beforeAll(() => {
        decoded = verifyQrToken(validToken);
      });

      it('returns the original ticketId as a string', () => {
        expect(decoded.ticketId).toBe(String(VALID_TICKET.ticketId));
      });

      it('returns the original studentId as a string', () => {
        expect(decoded.studentId).toBe(String(VALID_TICKET.studentId));
      });

      it('returns the original workshopId as a string', () => {
        expect(decoded.workshopId).toBe(String(VALID_TICKET.workshopId));
      });

      it('includes standard JWT registered claims (iat, exp, jti)', () => {
        expect(decoded.iat).toBeDefined();
        expect(decoded.exp).toBeDefined();
        expect(decoded.jti).toBeDefined();
      });
    });

    // ── Signature tampering ───────────────────────────────────────────────────

    describe('when the token has been tampered with', () => {
      it('throws JsonWebTokenError when the signature segment is altered', () => {
        const tampered = tamperSignature(validToken);
        expect(() => verifyQrToken(tampered)).toThrow(jwt.JsonWebTokenError);
      });

      it('throws JsonWebTokenError with "invalid signature" when the signature is altered', () => {
        const tampered = tamperSignature(validToken);
        expect(() => verifyQrToken(tampered)).toThrow(/invalid signature/i);
      });

      it('throws JsonWebTokenError when the payload is altered without re-signing', () => {
        // Re-encodes the payload as valid JSON so jwt.verify reaches the
        // signature check — which then fails because the signature no longer
        // covers the modified payload bytes.
        const tampered = tamperPayload(validToken);
        expect(() => verifyQrToken(tampered)).toThrow(jwt.JsonWebTokenError);
      });

      it('rejects a token signed by a completely different private key', () => {
        // Simulate a forged token: sign with a fresh key pair that the server
        // does not recognise. The server's PUBLIC_KEY will not verify it.
        const { privateKey: attackerKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
          publicKeyEncoding: { type: 'spki', format: 'pem' },
        });
        const forgedToken = jwt.sign({ ticketId: '999' }, attackerKey, {
          algorithm: 'RS256',
        });
        expect(() => verifyQrToken(forgedToken)).toThrow(jwt.JsonWebTokenError);
      });

      it('rejects a token whose algorithm header has been switched to "none" (alg:none attack)', () => {
        // Reconstruct the token with alg:none and no signature.
        const payload = jwt.decode(validToken);
        const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' }))
          .toString('base64url');
        const nonePayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const noneToken = `${noneHeader}.${nonePayload}.`;

        expect(() => verifyQrToken(noneToken)).toThrow(jwt.JsonWebTokenError);
      });
    });

    // ── Expired token ─────────────────────────────────────────────────────────

    describe('when the token is expired', () => {
      it('throws TokenExpiredError', () => {
        // Load the real private key the same way the utility does.
        const privateKey = process.env.QR_JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
        const expiredToken = jwt.sign(
          { ticketId: '1', studentId: '2', workshopId: '3' },
          privateKey,
          { algorithm: 'RS256', expiresIn: -1 },
        );

        expect(() => verifyQrToken(expiredToken)).toThrow(jwt.TokenExpiredError);
      });
    });

    // ── Invalid token format ──────────────────────────────────────────────────

    describe('when the token argument is structurally invalid', () => {
      it('throws when token is an empty string', () => {
        expect(() => verifyQrToken('')).toThrow(
          '[qrToken] verifyQrToken requires a non-empty token string.',
        );
      });

      it('throws when token is null', () => {
        expect(() => verifyQrToken(null)).toThrow(
          '[qrToken] verifyQrToken requires a non-empty token string.',
        );
      });

      it('throws when token is a number, not a string', () => {
        expect(() => verifyQrToken(12345)).toThrow(
          '[qrToken] verifyQrToken requires a non-empty token string.',
        );
      });

      it('throws JsonWebTokenError when token is a random non-JWT string', () => {
        expect(() => verifyQrToken('this.is.garbage')).toThrow(jwt.JsonWebTokenError);
      });

      it('throws JsonWebTokenError when token is a plain UUID (no structure)', () => {
        expect(() => verifyQrToken('550e8400-e29b-41d4-a716-446655440000')).toThrow(
          jwt.JsonWebTokenError,
        );
      });
    });

    // ── Missing environment variable ──────────────────────────────────────────

    describe('when QR_JWT_PUBLIC_KEY env var is not set', () => {
      let savedPublicKey;

      beforeEach(() => {
        savedPublicKey = process.env.QR_JWT_PUBLIC_KEY;
        delete process.env.QR_JWT_PUBLIC_KEY;
      });

      afterEach(() => {
        process.env.QR_JWT_PUBLIC_KEY = savedPublicKey;
      });

      it('throws an error that names the missing variable', () => {
        expect(() => verifyQrToken(validToken)).toThrow('QR_JWT_PUBLIC_KEY');
      });

      it('throws an error that guides the developer to fix it', () => {
        expect(() => verifyQrToken(validToken)).toThrow(
          /Missing required environment variable/,
        );
      });
    });
  });
});
