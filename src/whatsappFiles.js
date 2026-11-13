// ===== PHONE FILES: read an exported WhatsApp chat =====
// Accepts any mix of: the .zip from "Export chat" (iPhone, or Android via some apps),
// the chat .txt, and the photos (Android shares the .txt and photos as separate files).
import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { strFromU8 } from 'fflate';
import { listZip, readZipEntry } from './logic/zipReader';
import { bytesHash } from './logic/whatsapp';

const IMG = /\.(jpe?g|png|webp|heic|heif)$/i;
const base = (p) => String(p || '').split('/').pop();

function tempDir() {
  const dir = new Directory(Paths.cache, 'wa-import');
  try {
    if (dir.exists) dir.delete();
  } catch (_e) {
    // ignore
  }
  dir.create({ intermediates: true });
  return dir;
}

// Pick the chat text: the WhatsApp chat file, else the biggest .txt
function chooseChat(texts) {
  if (!texts.length) return null;
  const wa = texts.find((t) => /^_chat\.txt$|whatsapp/i.test(t.name));
  return wa || texts.slice().sort((a, b) => b.text.length - a.text.length)[0];
}

// Returns null when cancelled, else { name, text, photos: { fileName: uri }, files }
export async function pickChatFiles() {
  const res = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets || !res.assets.length) return null;
  const texts = [];
  const photos = {};
  const dups = new Set(); // photo names that are the same picture as an earlier one
  const seen = new Set();
  const isDup = (name, bytes) => {
    const h = bytesHash(bytes);
    if (seen.has(h)) {
      dups.add(name);
      return true;
    }
    seen.add(h);
    return false;
  };
  let dir = null;
  for (const a of res.assets) {
    const name = a.name || base(a.uri);
    if (/\.zip$/i.test(name) || a.mimeType === 'application/zip') {
      // Read the zip piece by piece: a big export would not fit in memory at once
      const zf = new File(a.uri);
      const h = zf.open();
      try {
        const read = (offset, length) => {
          h.offset = offset;
          return h.readBytes(length);
        };
        const entries = listZip(read, h.size != null ? h.size : zf.size);
        let k = 0;
        for (const en of entries) {
          // let the screen redraw now and then on big exports
          k += 1;
          if (k % 15 === 0) await new Promise((r) => setTimeout(r, 0));
          const n = base(en.name);
          if (!n || n.startsWith('.')) continue;
          if (/\.txt$/i.test(n)) {
            texts.push({ name: n, text: strFromU8(readZipEntry(read, en)) });
          } else if (IMG.test(n)) {
            const bytes = readZipEntry(read, en);
            if (isDup(n, bytes)) continue;
            dir = dir || tempDir();
            const f = new File(dir, n);
            if (f.exists) f.delete();
            f.create();
            f.write(bytes);
            photos[n] = f.uri;
          }
          // videos, voice notes and documents are skipped without reading them
        }
      } finally {
        h.close();
      }
    } else if (/\.txt$/i.test(name) || (a.mimeType || '').startsWith('text/')) {
      texts.push({ name, text: await new File(a.uri).text() });
    } else if (IMG.test(name) || (a.mimeType || '').startsWith('image/')) {
      let dup = false;
      try {
        dup = isDup(name, await new File(a.uri).bytes());
      } catch (_e) {
        // could not read it to compare: keep it
      }
      if (!dup) photos[name] = a.uri;
    }
  }
  const chat = chooseChat(texts);
  if (!chat) {
    throw new Error(
      'No chat text found. Pick the exported .zip, or the "WhatsApp Chat with ….txt" file together with its photos.'
    );
  }
  return { name: chat.name, text: chat.text, photos, dups, files: res.assets.length };
}
