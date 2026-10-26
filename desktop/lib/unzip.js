// Minimal zip reader (stored + deflate), enough for GitHub artifact zips.
const zlib = require('zlib');

function unzip(buf) {
  // find End Of Central Directory
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Bad zip directory');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const lnl = buf.readUInt16LE(local + 26), lxl = buf.readUInt16LE(local + 28);
    const start = local + 30 + lnl + lxl;
    const data = buf.subarray(start, start + csize);
    if (!name.endsWith('/')) files[name] = method === 0 ? Buffer.from(data) : zlib.inflateRawSync(data);
    p += 46 + nlen + xlen + clen;
  }
  return files;
}

module.exports = { unzip };
