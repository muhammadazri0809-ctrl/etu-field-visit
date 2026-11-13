// ===== BACKUP FILE FORMAT (pure helpers, no phone APIs) =====
// A backup is one JSON file:
// { app: 'etu-field-visit', format: 1, createdAt, data: {...lists}, photos: { "<old uri>": "<base64>" } }

export const BACKUP_APP = 'etu-field-visit';
export const BACKUP_FORMAT = 1;

// What each saved part looks like when empty
export const DATA_SHAPE = {
  estates: [],
  fields: [],
  visits: [],
  actions: [],
  settings: {},
  sel: {},
  etu: [],
};

const PHOTO_RE = /^(file|content):\/\/.+\.(jpe?g|png|heic|heif|webp)$/i;

// Every photo file path found anywhere in the data (no duplicates)
export function collectPhotoUris(data) {
  const out = new Set();
  const walk = (v) => {
    if (typeof v === 'string') {
      if (PHOTO_RE.test(v)) out.add(v);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === 'object') {
      Object.values(v).forEach(walk);
    }
  };
  walk(data);
  return [...out];
}

// Copy of the data with photo paths swapped using map { old: new }
export function remapPhotos(data, map) {
  const walk = (v) => {
    if (typeof v === 'string') return map[v] || v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).forEach((k) => (o[k] = walk(v[k])));
      return o;
    }
    return v;
  };
  return walk(data);
}

export function makeBackup(data, photos, now) {
  const d = {};
  Object.keys(DATA_SHAPE).forEach((k) => (d[k] = data[k] === undefined ? DATA_SHAPE[k] : data[k]));
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    createdAt: (now || new Date()).toISOString(),
    data: d,
    photos: photos || {},
  };
}

// Check a backup read from a file. Returns { data, photos, createdAt } or throws a readable Error.
export function readBackup(obj) {
  if (!obj || typeof obj !== 'object' || obj.app !== BACKUP_APP) {
    throw new Error('This is not an ETU Field Visit backup file.');
  }
  if (typeof obj.format !== 'number' || obj.format > BACKUP_FORMAT) {
    throw new Error('This backup was made by a newer version of the app. Update the app first.');
  }
  const src = obj.data || {};
  const data = {};
  Object.keys(DATA_SHAPE).forEach((k) => {
    const want = DATA_SHAPE[k];
    const v = src[k];
    if (v === undefined || v === null) data[k] = want;
    else if (Array.isArray(want) !== Array.isArray(v) || typeof v !== 'object') {
      throw new Error('The backup file is damaged ("' + k + '" has the wrong shape).');
    } else data[k] = v;
  });
  const photos = obj.photos && typeof obj.photos === 'object' ? obj.photos : {};
  return { data, photos, createdAt: obj.createdAt || '' };
}

export function backupSummary(data) {
  return (
    data.estates.length + ' estates, ' + data.fields.length + ' fields, ' +
    (data.visits.length + data.etu.length) + ' visits, ' + data.actions.length + ' follow-ups'
  );
}

export function backupFileName(now) {
  const d = now || new Date();
  const p = (n) => String(n).padStart(2, '0');
  return 'etu-backup-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    '-' + p(d.getHours()) + p(d.getMinutes()) + '.json';
}
