import { buildImport, extractFiles, findFields, groupsToVisits, guessCategory, parseChat, splitLabels } from '../whatsapp';

const estates = [
  { id: 'bb', name: 'Bukit Badak' },
  { id: 'cr', name: 'CEP Rengam Estate' },
];
const fields = [
  { id: 'f1', estateId: 'bb', code: '2016A' },
  { id: 'f2', estateId: 'bb', code: '2018B' },
  { id: 'f3', estateId: 'cr', code: '2022B' },
];

const ANDROID = `13/11/2026, 08:58 - Messages and calls are end-to-end encrypted. Only people in this chat can read them.
13/11/2026, 09:00 - Azri: Lawatan Bukit Badak hari ini
13/11/2026, 09:05 - Azri: Field 2016A
13/11/2026, 09:06 - Azri: IMG-20261113-WA0001.jpg (file attached)
13/11/2026, 09:07 - Azri: Bagworm attack on lower fronds, about 5 ha affected
Action: census and spray within 2 weeks
13/11/2026, 09:08 - Azri: IMG-20261113-WA0002.jpg (file attached)
13/11/2026, 09:30 - Azri: Blok 2018B
13/11/2026, 09:31 - Azri: IMG-20261113-WA0003.jpg (fail dilampirkan)
Harvesting path blocked by fronds
13/11/2026, 10:15 - Azri: CEP Rengam field 2022B drain clogged, water logging near collection road
13/11/2026, 10:16 - Azri: <Media omitted>`;

const IOS = `[14/11/2026, 9:15:22 AM] Siti: Bukit Badak 2016A
[14/11/2026, 9:16:01 AM] Siti: ‎<attached: 00000012-PHOTO-2026-11-14-09-16-01.jpg>
[14/11/2026, 9:17:40 AM] Siti: Good practice: frond stacking neat in U shape
[14/11/2026, 1:05:00 PM] Siti: Estate: Sungai Lembu
[14/11/2026, 1:06:00 PM] Siti: Field 7C rat damage on fresh bunches`;

test('extractFiles handles Android, Malay and iPhone formats', () => {
  expect(extractFiles('IMG-20261113-WA0001.jpg (file attached)')).toEqual({ files: ['IMG-20261113-WA0001.jpg'], rest: '' });
  expect(extractFiles('IMG-1.jpg (fail dilampirkan)\nCaption here').files).toEqual(['IMG-1.jpg']);
  expect(extractFiles('‎<attached: 0001-PHOTO.jpg> nice').files).toEqual(['0001-PHOTO.jpg']);
  expect(extractFiles('VID-1.mp4 (file attached)').files).toEqual([]);
});

test('parseChat: Android export', () => {
  const m = parseChat(ANDROID);
  expect(m).toHaveLength(9);
  expect(m[0]).toMatchObject({ date: '2026-11-13', time: '09:00', sender: 'Azri' });
  expect(m[3].text).toContain('Action: census');
  expect(m[2].files).toEqual(['IMG-20261113-WA0001.jpg']);
  expect(m[6]).toMatchObject({ files: ['IMG-20261113-WA0003.jpg'], text: 'Harvesting path blocked by fronds' });
  expect(m[8].omitted).toBe(true);
});

test('parseChat: iPhone export with AM/PM', () => {
  const m = parseChat(IOS);
  expect(m[0]).toMatchObject({ date: '2026-11-14', time: '09:15', sender: 'Siti' });
  expect(m[3].time).toBe('13:05');
  expect(m[1].files).toEqual(['00000012-PHOTO-2026-11-14-09-16-01.jpg']);
});

test('parseChat: month-first dates are detected', () => {
  const m = parseChat('11/13/26, 9:00 PM - A: hello there friend\n11/14/26, 9:00 AM - A: again');
  expect(m[0].date).toBe('2026-11-13');
  expect(m[0].time).toBe('21:00');
});

test('findFields and helpers', () => {
  expect(findFields('Blok 12 and field 2016A', [])).toEqual(['12', '2016A']);
  expect(findFields('check 2018b today', ['2018B'])).toEqual(['2018B']);
  expect(guessCategory('Bagworm on fronds')).toBe('Pest & Disease');
  expect(guessCategory('drain clogged')).toBe('Drainage / Water Mgmt.');
  expect(splitLabels('Rat damage\nAction: baiting\nPunca: no owl boxes')).toEqual({ issue: 'Rat damage', action: 'baiting', root: 'no owl boxes' });
});

test('buildImport: Android chat -> estate, fields, observations, photos', () => {
  const { groups, stats } = buildImport(parseChat(ANDROID), estates, fields, null);
  expect(groups.map((g) => g.estateName)).toEqual(['Bukit Badak', 'CEP Rengam Estate']);
  const bb = groups[0];
  expect(bb.date).toBe('2026-11-13');
  expect(bb.fields.map((f) => f.code)).toEqual(['2016A', '2018B']);
  const f16 = bb.fields[0];
  expect(f16.fieldId).toBe('f1');
  expect(f16.obs).toHaveLength(1);
  // photo before and after the message both attach to it
  expect(f16.obs[0].files).toEqual(['IMG-20261113-WA0001.jpg', 'IMG-20261113-WA0002.jpg']);
  expect(f16.obs[0]).toMatchObject({ category: 'Pest & Disease', status: 'attention', action: 'census and spray within 2 weeks' });
  expect(bb.fields[1].obs[0]).toMatchObject({ files: ['IMG-20261113-WA0003.jpg'], category: 'Field Upkeep / Weeding' });
  const cr = groups[1];
  expect(cr.fields[0]).toMatchObject({ code: '2022B', fieldId: 'f3' });
  expect(cr.fields[0].obs[0].category).toBe('Drainage / Water Mgmt.');
  expect(stats.omitted).toBe(1);
  expect(stats.obs).toBe(3);
});

test('buildImport: iPhone chat with an estate that is not in the app yet', () => {
  const { groups } = buildImport(parseChat(IOS), estates, fields, null);
  expect(groups[0]).toMatchObject({ estateId: 'bb', date: '2026-11-14' });
  const o = groups[0].fields[0].obs[0];
  expect(o.files).toEqual(['00000012-PHOTO-2026-11-14-09-16-01.jpg']);
  expect(o.status).toBe('good');
  expect(o.category).toBe('Field Practice');
  expect(groups[1]).toMatchObject({ estateId: null, estateName: 'Sungai Lembu' });
  expect(groups[1].fields[0]).toMatchObject({ code: '7C', fieldId: null });
  expect(groups[1].fields[0].obs[0].category).toBe('Pest & Disease');
});

test('buildImport: chat that never names an estate uses the chosen default', () => {
  const chat = '13/11/2026, 09:00 - A: Field 2016A loose fruits not collected at the platform';
  const { groups } = buildImport(parseChat(chat), estates, fields, 'cr');
  // 2016A belongs to Bukit Badak but the default estate is used when chosen
  expect(groups[0].estateId).toBe('cr');
  const g2 = buildImport(parseChat(chat), estates, fields, null).groups[0];
  expect(g2.estateId).toBe('bb'); // unique field code found the estate
});

test('groupsToVisits: creates visits, new estates and links photos', () => {
  const { groups } = buildImport(parseChat(IOS), estates, fields, null);
  let n = 0;
  const out = groupsToVisits(groups, {
    estates,
    fallbackEstateId: null,
    newId: () => 'id' + ++n,
    photoUri: (name) => (name.includes('PHOTO') ? 'file:///kept/' + name : null),
  });
  expect(out.newEstates).toHaveLength(1);
  expect(out.newEstates[0].name).toBe('Sungai Lembu');
  expect(out.visits).toHaveLength(2);
  expect(out.visits[0]).toMatchObject({ estateId: 'bb', date: '2026-11-14', visitedBy: 'Siti', status: 'draft' });
  expect(out.visits[0].fields[0]).toMatchObject({ fieldId: 'f1', code: '2016A' });
  expect(out.visits[0].fields[0].obs[0].photos).toEqual(['file:///kept/00000012-PHOTO-2026-11-14-09-16-01.jpg']);
  expect(out.visits[1].estateId).toBe(out.newEstates[0].id);
  expect(out.attached).toBe(1);
  expect(out.missing).toBe(0);
});
