import { buildImport, dropDeletedMessageObs, findEstate, importKey, relink, textHash, extractFiles, findFields, groupsToVisits, guessCategory, parseChat, splitLabels } from '../whatsapp';

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

// Team style: estate, then a field code, then one issue per line, then photos
const TEAM = `12/11/2026, 09:00 - Muhammad Azri: Bukit Badak
12/11/2026, 09:01 - Muhammad Azri: 2008B
Ganoderma
Circle Raking
Frond stacking
12/11/2026, 09:02 - Muhammad Azri: IMG-20261112-WA0001.jpg (file attached)
12/11/2026, 09:02 - Muhammad Azri: IMG-20261112-WA0002.jpg (file attached)
12/11/2026, 09:02 - Muhammad Azri: IMG-20261112-WA0003.jpg (file attached)
12/11/2026, 09:03 - Muhammad Azri: IMG-20261112-WA0004.jpg (file attached)
12/11/2026, 09:05 - Muhammad Azri: You deleted this message
12/11/2026, 09:06 - Muhammad Azri: This message was deleted
12/11/2026, 09:07 - Muhammad Azri: Mesej ini telah dipadam
12/11/2026, 09:10 - Muhammad Azri: 2016A
Spotted Strip Spraying
Action: spray within 2 weeks
Good pruning <This message was edited>
12/11/2026, 09:11 - Muhammad Azri: IMG-20261112-WA0005.jpg (file attached)
12/11/2026, 09:12 - Muhammad Azri: ok
12/11/2026, 09:13 - Muhammad Azri: 2016A
Spotted strip spraying
12/11/2026, 11:30 - Muhammad Azri: IMG-20261112-WA0009.jpg (file attached)`;

test('buildImport: one issue per line, deleted messages skipped, photos shared out', () => {
  const { groups, stats } = buildImport(parseChat(TEAM), estates, fields, null, new Set(['IMG-20261112-WA0004.jpg']));
  expect(groups).toHaveLength(1);
  const g = groups[0];
  expect(g).toMatchObject({ estateId: 'bb', date: '2026-11-12' });
  expect(g.fields.map((f) => f.code)).toEqual(['2008B', '2016A']);
  const [f08, f16] = g.fields;
  expect(f08.obs.map((o) => o.title)).toEqual(['Ganoderma', 'Circle Raking', 'Canopy Management']);
  expect(f08.obs.map((o) => o.category)).toEqual(['Pest & Disease', 'Field Upkeep / Weeding', 'Field Practice']);
  // photos shared over the message's lines in order; the repeated picture (WA0004) is dropped
  expect(f08.obs.map((o) => o.files)).toEqual([['IMG-20261112-WA0001.jpg'], ['IMG-20261112-WA0002.jpg'], ['IMG-20261112-WA0003.jpg']]);
  expect(f16.fieldId).toBe('f1');
  expect(f16.obs).toHaveLength(2); // the repeated "spotted strip spraying" is not added again
  expect(f16.obs[0]).toMatchObject({ title: 'Strip Spray', status: 'attention', action: 'spray within 2 weeks', files: ['IMG-20261112-WA0005.jpg'] });
  expect(f16.obs[1]).toMatchObject({ title: 'Canopy Management', status: 'good', issue: 'Good pruning' });
  expect(stats).toMatchObject({ deleted: 3, dupPhotos: 1, unplaced: 1, obs: 5 });
  expect(JSON.stringify(groups)).not.toMatch(/deleted/i);
});

test('buildImport: a pest line is not titled as canopy because of "fronds"', () => {
  const chat = '13/11/2026, 09:00 - A: Bukit Badak 2016A\n13/11/2026, 09:01 - A: Bagworm on lower fronds';
  const o = buildImport(parseChat(chat), estates, fields, null).groups[0].fields[0].obs[0];
  expect(o).toMatchObject({ title: 'Bagworm on lower fronds', category: 'Pest & Disease' });
});

test('buildImport: chat with an estate that is not in the app yet', () => {
  const { groups } = buildImport(parseChat(IOS), estates, fields, null);
  expect(groups[0]).toMatchObject({ estateId: 'bb', date: '2026-11-14' });
  const o = groups[0].fields[0].obs[0];
  expect(o).toMatchObject({ status: 'good', title: 'Canopy Management', files: ['00000012-PHOTO-2026-11-14-09-16-01.jpg'] });
  expect(groups[1]).toMatchObject({ estateId: null, estateName: 'Sungai Lembu' });
  expect(groups[1].fields[0]).toMatchObject({ code: '7C', fieldId: null });
  expect(groups[1].fields[0].obs[0]).toMatchObject({ category: 'Pest & Disease', issue: 'Rat damage on fresh bunches' });
});

test('buildImport: field codes decide the estate; the default is for unknown fields', () => {
  const chat = '13/11/2026, 09:00 - A: Field 2016A loose fruits not collected at the platform';
  const g = buildImport(parseChat(chat), estates, fields, 'cr').groups[0];
  expect(g.estateId).toBe('bb'); // 2016A only exists in Bukit Badak
  expect(g.fields[0].obs[0]).toMatchObject({ title: 'Crop Losses', category: 'Harvesting' });
  const other = '13/11/2026, 09:00 - A: Field 2099Z loose fruits not collected at the platform';
  expect(buildImport(parseChat(other), estates, fields, 'cr').groups[0].estateId).toBe('cr');
});

// Six-estate style trip: some estates are not in the app, one is misspelled
const TRIP = `12/11/2026, 08:00 - Azri: CEP Renggam
12/11/2026, 08:01 - Azri: 2022B
Vacant point due to HEC
Supplying WIP
12/11/2026, 10:00 - Azri: Sungai Lembu
12/11/2026, 10:01 - Azri: 2015A
Good deboiling
Spotted strip spraying
12/11/2026, 11:00 - Azri: Ladang Sri Jaya
2019A
Delay circle raking
12/11/2026, 13:00 - Azri: Bukit Badak
2008B
Ganoderma
12/11/2026, 15:00 - Azri: CEP Rengam
2023B
Basal pruning in progress`;

test('buildImport: new estates from name lines, misspelled names, one visit per estate per day', () => {
  const { groups } = buildImport(parseChat(TRIP), estates, fields, null);
  const names = groups.map((g) => g.estateName);
  expect(names).toEqual(['CEP Rengam Estate', 'Sungai Lembu', 'Sri Jaya', 'Bukit Badak']);
  expect(groups[0].estateId).toBe('cr');
  expect(groups[0].fields.map((f) => f.code)).toEqual(['2022B', '2023B']); // both CEP Rengam messages, one visit
  expect(groups[0].fields[0].obs.map((o) => o.issue)).toEqual(['Vacant point due to HEC', 'Supplying WIP']);
  expect(groups[1]).toMatchObject({ estateId: null, estateName: 'Sungai Lembu' });
  expect(groups[2].fields[0].obs[0].title).toBe('Circle Raking');
  let n = 0;
  const out = groupsToVisits(groups, { estates, fallbackEstateId: null, newId: () => 'id' + ++n, photoUri: () => null });
  expect(out.visits).toHaveLength(4);
  expect(out.newEstates.map((e) => e.name)).toEqual(['Sungai Lembu', 'Sri Jaya']);
});

test('groupsToVisits merges two groups that end up on the same estate and day', () => {
  const g = (key, estateId, code) => ({ key, estateId, estateName: '', date: '2026-11-12', fields: [{ code, fieldId: null, obs: [{ title: 't', issue: 'x', action: '', root: '', category: 'Other', status: 'attention', files: [], sender: 'A' }] }] });
  let n = 0;
  const out = groupsToVisits([g('a', 'cr', '2022B'), g('b', 'cr', '2020A')], { estates, fallbackEstateId: null, newId: () => 'id' + ++n, photoUri: () => null });
  expect(out.visits).toHaveLength(1);
  expect(out.visits[0].fields.map((f) => f.code)).toEqual(['2022B', '2020A']);
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

test('dropDeletedMessageObs removes old "You deleted this message" observations', () => {
  const keep = { id: 'o1', title: 'Ganoderma Fallen Palm', issue: 'Ganoderma Fallen Palm' };
  const visits = [
    { id: 'v1', fields: [{ code: '2010B', obs: [keep, { id: 'o2', title: 'You deleted this message', issue: 'You deleted this message' }] }] },
    { id: 'v2', fields: [{ code: '2011A', obs: [keep] }] },
  ];
  const out = dropDeletedMessageObs(visits);
  expect(out[0].fields[0].obs).toEqual([keep]);
  expect(out[1]).toBe(visits[1]);
  expect(dropDeletedMessageObs(out)).toBe(out); // nothing left to change
});

test('estate data matching: short distinctive names, hyphenated codes, relink after picking', () => {
  const est = [
    { id: 'a', name: 'CEP Rengam Estate' },
    { id: 'b', name: 'Sungai Mai' },
    { id: 'c', name: 'Sungai Lembu' },
  ];
  expect(findEstate('Rengam', est).id).toBe('a');
  expect(findEstate('Renggam today', est).id).toBe('a');
  expect(findEstate('Lembu', est).id).toBe('c');
  expect(findEstate('Sungai', est)).toBeNull(); // shared word, not enough
  expect(findEstate('rat damage near the rengam road junction and more words', est)).toBeNull(); // long remark line
  const chat = '12/11/2026, 09:00 - A: Bukit Badak\n12/11/2026, 09:01 - A: 2016-A\nDelay circle raking';
  const g = buildImport(parseChat(chat), estates, fields, null).groups[0];
  expect(g.fields[0]).toMatchObject({ code: '2016A', fieldId: 'f1' });
  const moved = relink({ ...g, estateId: 'cr' }, fields);
  expect(moved.fields[0].fieldId).toBeNull(); // 2016A is not a CEP Rengam field
});

test('import keys: same chat, estate and day give the same key, so a second import is skipped', () => {
  const { groups } = buildImport(parseChat(TRIP), estates, fields, null);
  const id = textHash(TRIP);
  expect(textHash(TRIP)).toBe(id);
  expect(textHash(TRIP + ' ')).not.toBe(id);
  let n = 0;
  const out = groupsToVisits(groups, { estates, fallbackEstateId: null, newId: () => 'id' + ++n, photoUri: () => null, chatId: id });
  // after the first import the new estates exist; keys must not change
  const est2 = estates.concat(out.newEstates);
  const again = buildImport(parseChat(TRIP), est2, fields, null).groups;
  const keys1 = out.visits.map((v) => v.importKey).sort();
  const keys2 = [...new Set(again.map((g) => importKey(id, g, est2, null)))].sort();
  expect(keys2).toEqual(keys1);
});
