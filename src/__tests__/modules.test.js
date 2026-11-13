// Every screen and component module loads (catches broken imports between files)
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const glob = require('fs');
const path = require('path');

function jsFiles(dir) {
  return glob.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' ? [] : jsFiles(p);
    return p.endsWith('.js') ? [p] : [];
  });
}

test.each(jsFiles(path.join(__dirname, '..')).map((f) => [path.relative(__dirname + '/..', f), f]))(
  '%s loads',
  (_name, file) => {
    const mod = require(file);
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  }
);

test('App entry exports a component', () => {
  expect(typeof require('../../App').default).toBe('function');
});
