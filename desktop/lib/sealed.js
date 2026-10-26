// libsodium-compatible sealed box (crypto_box_seal), which GitHub requires for Actions secrets.
// Uses vendored tweetnacl (public domain) and a small BLAKE2b for the nonce.
const nacl = require('./nacl-fast.js');

// ---- BLAKE2b (RFC 7693), variable output length ----
const IV = [0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1,
  0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179];
const SIGMA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4], [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13], [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11], [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5], [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0]];
const M64 = (1n << 64n) - 1n;
const rotr = (x, n) => ((x >> BigInt(n)) | (x << BigInt(64 - n))) & M64;
const ivb = Array.from({ length: 8 }, (_, i) => (BigInt(IV[2 * i]) << 32n) | BigInt(IV[2 * i + 1]));

function compress(h, block, t, last) {
  const m = Array.from({ length: 16 }, (_, i) => {
    let w = 0n;
    for (let j = 7; j >= 0; j--) w = (w << 8n) | BigInt(block[i * 8 + j]);
    return w;
  });
  const v = [...h, ...ivb];
  v[12] ^= BigInt(t) & M64;
  if (last) v[14] ^= M64;
  const G = (a, b, c, d, x, y) => {
    v[a] = (v[a] + v[b] + x) & M64; v[d] = rotr(v[d] ^ v[a], 32);
    v[c] = (v[c] + v[d]) & M64; v[b] = rotr(v[b] ^ v[c], 24);
    v[a] = (v[a] + v[b] + y) & M64; v[d] = rotr(v[d] ^ v[a], 16);
    v[c] = (v[c] + v[d]) & M64; v[b] = rotr(v[b] ^ v[c], 63);
  };
  for (let r = 0; r < 12; r++) {
    const s = SIGMA[r % 10];
    G(0, 4, 8, 12, m[s[0]], m[s[1]]); G(1, 5, 9, 13, m[s[2]], m[s[3]]);
    G(2, 6, 10, 14, m[s[4]], m[s[5]]); G(3, 7, 11, 15, m[s[6]], m[s[7]]);
    G(0, 5, 10, 15, m[s[8]], m[s[9]]); G(1, 6, 11, 12, m[s[10]], m[s[11]]);
    G(2, 7, 8, 13, m[s[12]], m[s[13]]); G(3, 4, 9, 14, m[s[14]], m[s[15]]);
  }
  for (let i = 0; i < 8; i++) h[i] ^= v[i] ^ v[i + 8];
}

function blake2b(input, outlen) {
  const h = ivb.slice();
  h[0] ^= 0x01010000n ^ BigInt(outlen);
  let t = 0;
  const n = input.length;
  let off = 0;
  while (n - off > 128) {
    t += 128;
    compress(h, input.subarray(off, off + 128), t, false);
    off += 128;
  }
  const last = new Uint8Array(128);
  last.set(input.subarray(off));
  t += n - off;
  compress(h, last, t, true);
  const out = new Uint8Array(outlen);
  for (let i = 0; i < outlen; i++) out[i] = Number((h[i >> 3] >> BigInt(8 * (i & 7))) & 0xffn);
  return out;
}

function seal(message, recipientPk) {
  const eph = nacl.box.keyPair();
  const nonceIn = new Uint8Array(64);
  nonceIn.set(eph.publicKey, 0);
  nonceIn.set(recipientPk, 32);
  const nonce = blake2b(nonceIn, 24);
  const ct = nacl.box(message, nonce, recipientPk, eph.secretKey);
  const out = new Uint8Array(32 + ct.length);
  out.set(eph.publicKey, 0);
  out.set(ct, 32);
  return out;
}

// GitHub: base64 public key in, base64 encrypted value out
function encryptSecret(publicKeyB64, value) {
  const pk = new Uint8Array(Buffer.from(publicKeyB64, 'base64'));
  return Buffer.from(seal(new Uint8Array(Buffer.from(value, 'utf8')), pk)).toString('base64');
}

module.exports = { blake2b, seal, encryptSecret, nacl };
