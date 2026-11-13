// jest.mock calls are hoisted above the imports by babel-jest
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { WaImportScreen } from '../screens/WaImportScreen';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../whatsappFiles', () => ({
  pickChatFiles: async () => ({
    name: '_chat.txt',
    text: `[14/11/2026, 9:15:22 AM] Siti: Bukit Badak 2016A
[14/11/2026, 9:16:01 AM] Siti: ‎<attached: 0001-PHOTO.jpg>
[14/11/2026, 9:16:30 AM] Siti: ‎<attached: 0002-PHOTO.jpg>
[14/11/2026, 9:17:40 AM] Siti: Bagworm on lower fronds
Action: census and spray
[14/11/2026, 1:06:00 PM] Siti: Field 9Z rat damage on fresh bunches`,
    photos: { '0001-PHOTO.jpg': 'file:///tmp/1.jpg' },
  }),
}));
jest.mock('../storage', () => ({ keepPhoto: (u) => u.replace('/tmp/', '/kept/') }));

test('import screen: pick, preview, import', async () => {
  const estates = [{ id: 'bb', name: 'Bukit Badak' }];
  const fields = [{ id: 'f1', estateId: 'bb', code: '2016A' }];
  let out = null;
  let r;
  await act(async () => { r = TestRenderer.create(<WaImportScreen estates={estates} fields={fields} onImport={(o) => (out = o)} />); });
  const text = () => r.root.findAll((n) => typeof n.children?.[0] === 'string').map((n) => n.children.join('')).join(' | ');
  const press = async (label) => {
    const btn = r.root.findAll((n) => n.props.onPress && typeof n.props.label === 'string' && n.props.label.includes(label))[0];
    await act(async () => { await btn.props.onPress(); });
  };
  await press('PICK CHAT FILES');
  const t = text();
  expect(t).toContain('2 observations');
  expect(t).toContain('1 of 2 photos');
  expect(t).toContain('Field 2016A');
  expect(t).toContain('IMPORT 1 VISIT');
  await press('IMPORT 1 VISIT');
  expect(out.visits).toHaveLength(1);
  const obs = out.visits[0].fields.flatMap((f) => f.obs);
  expect(obs[0]).toMatchObject({ category: 'Pest & Disease', action: 'census and spray', photos: ['file:///kept/1.jpg'] });
  expect(obs[0].title).toBe('Bagworm on lower fronds');
  expect(out.visits[0].fields.map((f) => f.code)).toEqual(['2016A', '9Z']);
  expect(out.visits[0].fields[1].obs[0].issue).toBe('Rat damage on fresh bunches');
});
