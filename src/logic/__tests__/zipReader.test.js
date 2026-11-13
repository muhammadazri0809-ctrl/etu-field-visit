import { strToU8, zipSync } from 'fflate';
import { listZip, readZipEntry } from '../zipReader';

const reader = (zip) => {
  let reads = 0;
  let maxRead = 0;
  const read = (offset, length) => {
    reads += 1;
    maxRead = Math.max(maxRead, length);
    return zip.subarray(offset, offset + length);
  };
  return { read, stats: () => ({ reads, maxRead }) };
};

test('lists and reads stored and deflated entries one at a time', () => {
  const photo = new Uint8Array(200000).map((_, i) => (i * 7) % 251);
  const video = new Uint8Array(500000).map((_, i) => i % 256);
  const zip = zipSync({
    '_chat.txt': [strToU8('[13/11/2026, 9:00:00 AM] Azri: Bukit Badak 2016A ✓ ladang'), { level: 6 }],
    'IMG-20261113-WA0001.jpg': [photo, { level: 0 }],
    'media/IMG-20261113-WA0002.jpg': [photo, { level: 9 }],
    'VID-20261113-WA0003.mp4': [video, { level: 0 }],
    'empty/': new Uint8Array(0),
  });
  const { read, stats } = reader(zip);
  const list = listZip(read, zip.length);
  expect(list.map((e) => e.name)).toEqual([
    '_chat.txt',
    'IMG-20261113-WA0001.jpg',
    'media/IMG-20261113-WA0002.jpg',
    'VID-20261113-WA0003.mp4',
  ]);
  const txt = new TextDecoder().decode(readZipEntry(read, list[0]));
  expect(txt).toContain('Bukit Badak 2016A ✓ ladang');
  expect(readZipEntry(read, list[1])).toEqual(photo);
  expect(readZipEntry(read, list[2])).toEqual(photo);
  // never had to read the whole zip (the video was not read)
  expect(stats().maxRead).toBeLessThan(zip.length / 2);
});

test('zip with a comment at the end', () => {
  const zip = zipSync({ 'a.txt': strToU8('hello') }, { comment: 'exported by WhatsApp' });
  const { read } = reader(zip);
  const [e] = listZip(read, zip.length);
  expect(new TextDecoder().decode(readZipEntry(read, e))).toBe('hello');
});

test('not a zip', () => {
  const junk = strToU8('this is just text, not a zip file at all');
  expect(() => listZip(reader(junk).read, junk.length)).toThrow(/not a zip/);
});
