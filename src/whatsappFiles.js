// ===== PHONE FILES: read an exported WhatsApp chat =====
// Accepts any mix of: the .zip from "Export chat" (iPhone, or Android via some apps),
// the chat .txt, and the photos (Android shares the .txt and photos as separate files).
import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { strFromU8, unzipSync } from 'fflate';

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
  let dir = null;
  for (const a of res.assets) {
    const name = a.name || base(a.uri);
    if (/\.zip$/i.test(name) || a.mimeType === 'application/zip') {
      const bytes = await new File(a.uri).bytes();
      const entries = unzipSync(bytes, { filter: (f) => /\.txt$/i.test(f.name) || IMG.test(f.name) });
      Object.keys(entries).forEach((path) => {
        const n = base(path);
        if (!n || n.startsWith('.')) return;
        if (/\.txt$/i.test(n)) {
          texts.push({ name: n, text: strFromU8(entries[path]) });
        } else {
          dir = dir || tempDir();
          const f = new File(dir, n);
          if (f.exists) f.delete();
          f.create();
          f.write(entries[path]);
          photos[n] = f.uri;
        }
      });
    } else if (/\.txt$/i.test(name) || (a.mimeType || '').startsWith('text/')) {
      texts.push({ name, text: await new File(a.uri).text() });
    } else if (IMG.test(name) || (a.mimeType || '').startsWith('image/')) {
      photos[name] = a.uri;
    }
  }
  const chat = chooseChat(texts);
  if (!chat) {
    throw new Error(
      'No chat text found. Pick the exported .zip, or the "WhatsApp Chat with ….txt" file together with its photos.'
    );
  }
  return { name: chat.name, text: chat.text, photos, files: res.assets.length };
}
