import { backupFileName, collectPhotoUris, makeBackup, readBackup, remapPhotos } from '../backup';
import { syncEtuActions } from '../etu';

const data = {
  estates: [{ id: 'e1', name: 'Alpha' }],
  fields: [],
  visits: [{ id: 'v1', checks: { f1: { photos: { 3: ['file:///cache/a.jpg', 'file:///cache/b.png'] } } } }],
  actions: [],
  settings: { cost: '12' },
  sel: {},
  etu: [{ id: 'x', fields: [{ obs: [{ photos: ['file:///cache/a.jpg'], issue: 'see file:///nope.txt' }] }] }],
};

test('collectPhotoUris finds every photo once', () => {
  expect(collectPhotoUris(data).sort()).toEqual(['file:///cache/a.jpg', 'file:///cache/b.png']);
});

test('remapPhotos swaps paths and leaves the rest alone', () => {
  const out = remapPhotos(data, { 'file:///cache/a.jpg': 'file:///docs/photos/1.jpg' });
  expect(out.etu[0].fields[0].obs[0].photos).toEqual(['file:///docs/photos/1.jpg']);
  expect(out.visits[0].checks.f1.photos[3][1]).toBe('file:///cache/b.png');
  expect(out.settings).toEqual({ cost: '12' });
  expect(data.etu[0].fields[0].obs[0].photos[0]).toBe('file:///cache/a.jpg');
});

test('backup round trip', () => {
  const b = JSON.parse(JSON.stringify(makeBackup(data, { 'file:///cache/a.jpg': 'AAAA' }, new Date('2026-11-13T08:00:00Z'))));
  const r = readBackup(b);
  expect(r.data).toEqual(data);
  expect(r.photos).toEqual({ 'file:///cache/a.jpg': 'AAAA' });
  expect(r.createdAt).toBe('2026-11-13T08:00:00.000Z');
});

test('readBackup fills missing parts and rejects bad files', () => {
  expect(readBackup({ app: 'etu-field-visit', format: 1, data: { estates: [] } }).data.etu).toEqual([]);
  expect(() => readBackup({ hello: 1 })).toThrow(/not an ETU Field Visit backup/);
  expect(() => readBackup({ app: 'etu-field-visit', format: 99 })).toThrow(/newer version/);
  expect(() => readBackup({ app: 'etu-field-visit', format: 1, data: { estates: {} } })).toThrow(/damaged/);
});

test('backupFileName', () => {
  expect(backupFileName(new Date(2026, 0, 5, 9, 7))).toBe('etu-backup-2026-01-05-0907.json');
});

test('syncEtuActions keeps follow-up status and other actions', () => {
  const v = {
    id: 'V', estateId: 'e1', date: '2026-11-01',
    fields: [{ code: 'P01', fieldId: 'f1', obs: [
      { id: 'o1', status: 'attention', category: 'Pest & Disease', title: 'Bagworm', action: 'Spray\nthen census', due: '2026-12-01' },
      { id: 'o2', status: 'good', action: 'nothing' },
      { id: 'o3', status: 'monitor', action: '  ' },
    ] }],
  };
  const other = { id: 'manual-1', text: 'keep me' };
  const done = { id: 'etu-V-o1', status: 'done', doneAt: '2026-11-05', createdAt: '2026-11-01' };
  const out = syncEtuActions(v, [done, other]);
  expect(out).toHaveLength(2);
  expect(out[0]).toMatchObject({ id: 'etu-V-o1', status: 'done', doneAt: '2026-11-05', due: '2026-12-01', fieldId: 'f1' });
  expect(out[0].text).toMatch(/^Bagworm: Spray/);
  expect(out[1]).toBe(other);
});
