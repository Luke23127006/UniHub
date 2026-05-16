/**
 * Standalone HMAC-SHA256 implementation in pure JS.
 * No dependencies on native crypto modules.
 */

function sha256(m: string): string {
  const hash = (s: string) => {
    const chrsz = 8;
    const hexcase = 0;
    const safe_add = (x: any, y: any) => {
      const lsw = (x & 0xFFFF) + (y & 0xFFFF);
      const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return (msw << 16) | (lsw & 0xFFFF);
    };
    const S = (X: any, n: any) => (X >>> n) | (X << (32 - n));
    const R = (X: any, n: any) => (X >>> n);
    const Ch = (x: any, y: any, z: any) => (x & y) ^ (~x & z);
    const Maj = (x: any, y: any, z: any) => (x & y) ^ (x & z) ^ (y & z);
    const Sigma0256 = (x: any) => S(x, 2) ^ S(x, 13) ^ S(x, 22);
    const Sigma1256 = (x: any) => S(x, 6) ^ S(x, 11) ^ S(x, 25);
    const Gamma0256 = (x: any) => S(x, 7) ^ S(x, 18) ^ R(x, 3);
    const Gamma1256 = (x: any) => S(x, 17) ^ S(x, 19) ^ R(x, 10);
    const core_sha256 = (m: any, l: any) => {
      const K = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2];
      const HASH = [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19];
      const W = new Array(64);
      let a, b, c, d, e, f, g, h, i, j;
      let T1, T2;
      m[l >> 5] |= 0x80 << (24 - l % 32);
      m[((l + 64 >> 9) << 4) + 15] = l;
      for (i = 0; i < m.length; i += 16) {
        a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3]; e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
        for (j = 0; j < 64; j++) {
          if (j < 16) W[j] = m[j + i];
          else W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
          T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
          T2 = safe_add(Sigma0256(a), Maj(a, b, c));
          h = g; g = f; f = e; e = safe_add(d, T1); d = c; c = b; b = a; a = safe_add(T1, T2);
        }
        HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]); HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]); HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
      }
      return HASH;
    };
    const str2binb = (str: any) => {
      const bin = [];
      const mask = (1 << chrsz) - 1;
      for (let i = 0; i < str.length * chrsz; i += chrsz) bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
      return bin;
    };
    const Utf8Encode = (string: any) => {
      string = string.replace(/\r\n/g, '\n');
      let utftext = '';
      for (let n = 0; n < string.length; n++) {
        const c = string.charCodeAt(n);
        if (c < 128) utftext += String.fromCharCode(c);
        else if ((c > 127) && (c < 2048)) {
          utftext += String.fromCharCode((c >> 6) | 192);
          utftext += String.fromCharCode((c & 63) | 128);
        } else {
          utftext += String.fromCharCode((c >> 12) | 224);
          utftext += String.fromCharCode(((c >> 6) & 63) | 128);
          utftext += String.fromCharCode((c & 63) | 128);
        }
      }
      return utftext;
    };
    const binb2base64 = (binarray: any) => {
      const tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let str = '';
      for (let i = 0; i < binarray.length * 4; i += 3) {
        const triplet = (((binarray[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((binarray[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((binarray[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);
        for (let j = 0; j < 4; j++) {
          if (i * 8 + j * 6 > binarray.length * 32) str += '';
          else str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
        }
      }
      return str;
    };
    return binb2base64(core_sha256(str2binb(Utf8Encode(m)), Utf8Encode(m).length * chrsz));
  };
  return hash(m);
}

function hmacSha256(m: string, k: string): string {
  const chrsz = 8;
  const safe_add = (x: any, y: any) => {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  };
  const str2binb = (str: any) => {
    const bin = [];
    const mask = (1 << chrsz) - 1;
    for (let i = 0; i < str.length * chrsz; i += chrsz) bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
    return bin;
  };
  const binb2base64 = (binarray: any) => {
    const tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let str = '';
    for (let i = 0; i < binarray.length * 4; i += 3) {
      const triplet = (((binarray[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((binarray[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((binarray[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);
      for (let j = 0; j < 4; j++) {
        if (i * 8 + j * 6 > binarray.length * 32) str += '';
        else str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
      }
    }
    return str;
  };
  const core_hmac_sha256 = (key: any, data: any) => {
    const S = (X: any, n: any) => (X >>> n) | (X << (32 - n));
    const R = (X: any, n: any) => (X >>> n);
    const Ch = (x: any, y: any, z: any) => (x & y) ^ (~x & z);
    const Maj = (x: any, y: any, z: any) => (x & y) ^ (x & z) ^ (y & z);
    const Sigma0256 = (x: any) => S(x, 2) ^ S(x, 13) ^ S(x, 22);
    const Sigma1256 = (x: any) => S(x, 6) ^ S(x, 11) ^ S(x, 25);
    const Gamma0256 = (x: any) => S(x, 7) ^ S(x, 18) ^ R(x, 3);
    const Gamma1256 = (x: any) => S(x, 17) ^ S(x, 19) ^ R(x, 10);
    const core_sha256 = (m: any, l: any) => {
      const K = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2];
      const HASH = [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19];
      const W = new Array(64);
      let a, b, c, d, e, f, g, h, i, j;
      let T1, T2;
      m[l >> 5] |= 0x80 << (24 - l % 32);
      m[((l + 64 >> 9) << 4) + 15] = l;
      for (i = 0; i < m.length; i += 16) {
        a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3]; e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
        for (j = 0; j < 64; j++) {
          if (j < 16) W[j] = m[j + i];
          else W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
          T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
          T2 = safe_add(Sigma0256(a), Maj(a, b, c));
          h = g; g = f; f = e; e = safe_add(d, T1); d = c; c = b; b = a; a = safe_add(T1, T2);
        }
        HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]); HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]); HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
      }
      return HASH;
    };
    let bkey = str2binb(key);
    if (bkey.length > 16) bkey = core_sha256(bkey, key.length * chrsz);
    const ipad = new Array(16), opad = new Array(16);
    for (let i = 0; i < 16; i++) {
      ipad[i] = bkey[i] ^ 0x36363636;
      opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }
    const hash = core_sha256(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
    return core_sha256(opad.concat(hash), 512 + 256);
  };
  return binb2base64(core_hmac_sha256(k, m));
}

export async function verifyHS256(token: string, secret: string): Promise<boolean> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return false;

    const message = `${headerB64}.${payloadB64}`;
    const expectedSignatureB64 = hmacSha256(message, secret);
    
    return normalizeB64(signatureB64) === normalizeB64(expectedSignatureB64);
  } catch (err) {
    console.error('[Security] Manual verification failed:', err);
    return false;
  }
}

function normalizeB64(str: string): string {
  return str.replace(/-/g, '+').replace(/_/g, '/').replace(/=/g, '');
}
