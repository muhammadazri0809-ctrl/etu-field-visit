// =====================================================
// ZIP READER THAT READS ONE FILE AT A TIME
// A WhatsApp export can be hundreds of MB. Loading it all at once runs the phone
// out of memory, so this reads only the zip's table of contents, then each wanted
// file on its own. `read(offset, length)` returns those bytes of the zip.
// =====================================================
import { inflateSync, strFromU8 } from 'fflate';

const EOCD = 0x06054b50; // end of central directory
const Z64_LOC = 0x07064b50; // zip64 end-of-central-directory locator
const Z64_EOCD = 0x06064b50;
const CEN = 0x02014b50; // central directory entry
const LOC = 0x04034b50; // local file header
const MAX32 = 0xffffffff;

function view(b) {
  return new DataView(b.buffer, b.byteOffset, b.byteLength);
}
function u64(dv, at) {
  return dv.getUint32(at, true) + dv.getUint32(at + 4, true) * 0x100000000;
}

// Table of contents: [{ name, method, compSize, size, offset }]
export function listZip(read, zipSize) {
  // the end record is in the last 22 bytes + up to 64 KB of comment
  const tailLen = Math.min(zipSize, 22 + 0xffff);
  const tailStart = zipSize - tailLen;
  const tail = read(tailStart, tailLen);
  const tv = view(tail);
  let at = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tv.getUint32(i, true) === EOCD) {
      at = i;
      break;
    }
  }
  if (at < 0) throw new Error('This file is not a zip (or it is damaged).');
  let count = tv.getUint16(at + 10, true);
  let cdSize = tv.getUint32(at + 12, true);
  let cdOffset = tv.getUint32(at + 16, true);

  // zip64: very large zips or many files
  if (cdOffset === MAX32 || cdSize === MAX32 || count === 0xffff) {
    const locAt = at - 20;
    if (locAt >= 0 && tv.getUint32(locAt, true) === Z64_LOC) {
      const recOffset = u64(tv, locAt + 8);
      const rec = view(read(recOffset, 56));
      if (rec.getUint32(0, true) === Z64_EOCD) {
        count = u64(rec, 32);
        cdSize = u64(rec, 40);
        cdOffset = u64(rec, 48);
      }
    }
  }

  const cd = read(cdOffset, cdSize);
  const dv = view(cd);
  const out = [];
  let p = 0;
  for (let n = 0; n < count && p + 46 <= cd.length; n++) {
    if (dv.getUint32(p, true) !== CEN) break;
    const method = dv.getUint16(p + 10, true);
    let compSize = dv.getUint32(p + 20, true);
    let size = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    let offset = dv.getUint32(p + 42, true);
    const name = strFromU8(cd.subarray(p + 46, p + 46 + nameLen));
    // zip64 extra field holds the real sizes / offset
    let e = p + 46 + nameLen;
    const eEnd = e + extraLen;
    while (e + 4 <= eEnd) {
      const id = dv.getUint16(e, true);
      const len = dv.getUint16(e + 2, true);
      if (id === 0x0001) {
        let q = e + 4;
        if (size === MAX32) {
          size = u64(dv, q);
          q += 8;
        }
        if (compSize === MAX32) {
          compSize = u64(dv, q);
          q += 8;
        }
        if (offset === MAX32) offset = u64(dv, q);
      }
      e += 4 + len;
    }
    if (!name.endsWith('/')) out.push({ name, method, compSize, size, offset });
    p = eEnd + commentLen;
  }
  return out;
}

// Bytes of one file in the zip
export function readZipEntry(read, entry) {
  const head = view(read(entry.offset, 30));
  if (head.getUint32(0, true) !== LOC) throw new Error('Damaged zip entry: ' + entry.name);
  const start = entry.offset + 30 + head.getUint16(26, true) + head.getUint16(28, true);
  const data = read(start, entry.compSize);
  if (entry.method === 0) return data; // stored
  if (entry.method === 8) return inflateSync(data, { out: new Uint8Array(entry.size) }); // deflate
  throw new Error('Unsupported zip compression (' + entry.method + ') for ' + entry.name);
}
