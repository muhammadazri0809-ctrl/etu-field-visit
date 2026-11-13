// ===== PHONE FILES: photos kept by the app + backup / restore =====
import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { newId } from './logic/dates';
import { backupFileName, collectPhotoUris, makeBackup, readBackup, remapPhotos } from './logic/backup';

function photoDir() {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function extOf(uri) {
  const m = /\.([a-z0-9]{2,5})$/i.exec(uri || '');
  return m ? '.' + m[1].toLowerCase() : '.jpg';
}

// Photos from the camera / gallery start in the phone's cache folder, which
// Android may empty at any time. Copy them into the app's own folder.
export function keepPhoto(uri) {
  try {
    const dest = new File(photoDir(), newId() + extOf(uri));
    new File(uri).copy(dest);
    return dest.uri;
  } catch (_e) {
    return uri; // web / unusual source: keep the original path
  }
}

// Remove a kept photo file (only files inside the app's photo folder)
export function forgetPhoto(uri) {
  try {
    const dir = photoDir();
    if (uri && uri.startsWith(dir.uri)) {
      const f = new File(uri);
      if (f.exists) f.delete();
    }
  } catch (_e) {
    // ignore
  }
}

export function clearPhotos() {
  try {
    const dir = new Directory(Paths.document, 'photos');
    if (dir.exists) dir.delete();
  } catch (_e) {
    // ignore
  }
}

// Save all data (and photos) to one JSON file and open the phone's Share menu
// (WhatsApp, Drive, email, Files ...). Returns a short result message.
export async function exportBackup(data) {
  const photos = {};
  let missing = 0;
  for (const uri of collectPhotoUris(data)) {
    try {
      photos[uri] = await new File(uri).base64();
    } catch (_e) {
      missing += 1;
    }
  }
  const text = JSON.stringify(makeBackup(data, photos));
  const file = new File(Paths.cache, backupFileName());
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save ETU Field Visit backup',
    UTI: 'public.json',
  });
  const n = Object.keys(photos).length;
  return 'Backup made with ' + n + ' photo' + (n === 1 ? '' : 's') +
    (missing ? ' (' + missing + ' photo' + (missing === 1 ? ' was' : 's were') + ' already missing)' : '') + '.';
}

// Ask the user to pick a backup file. Returns { data, photos, createdAt } or null if cancelled.
export async function pickBackup() {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets || !res.assets.length) return null;
  const text = await new File(res.assets[0].uri).text();
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (_e) {
    throw new Error('This file is not a backup (it is not JSON).');
  }
  return readBackup(obj);
}

// Write the backup's photos into the app's photo folder and return data with the new paths
export function restorePhotos(backup) {
  const map = {};
  const dir = photoDir();
  Object.keys(backup.photos).forEach((oldUri) => {
    try {
      const dest = new File(dir, newId() + extOf(oldUri));
      dest.create();
      dest.write(backup.photos[oldUri], { encoding: 'base64' });
      map[oldUri] = dest.uri;
    } catch (_e) {
      // skip one bad photo, keep going
    }
  });
  return remapPhotos(backup.data, map);
}
