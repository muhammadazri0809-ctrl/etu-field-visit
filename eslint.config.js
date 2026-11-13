// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['node_modules/*', 'dist/*'] },
  // Plain quotes inside <Text> are fine in React Native
  { rules: { 'react/no-unescaped-entities': 'off' } },
  {
    files: ['**/__tests__/**', '**/*.test.js'],
    languageOptions: { globals: { describe: 'readonly', test: 'readonly', expect: 'readonly', jest: 'readonly', beforeEach: 'readonly', afterEach: 'readonly', __dirname: 'readonly', require: 'readonly' } },
  },
]);
