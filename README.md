# ETU Field Visit (Android app)

Expo / React Native app for estate field visits: activity triggers, follow-up
actions, cost and yield vs budget, photos, and Excel/CSV import.
All data is saved on the phone and works offline.

## Project layout

```
App.js                 entry point (re-exports src/App)
src/App.js             main app: saved data, page history, screen switch
src/theme.js           colours, fonts, all styles
src/useSavedState.js   state that saves itself to phone storage
src/storage.js         phone files: kept photos, backup / restore
src/logic/             pure logic (no screens) - covered by tests
  rules.js             10 activities, triggers, cost & yield maths
  importRows.js        Excel / CSV / pasted table import
  reportWorkbook.js    full estate report workbook import
  etu.js               ETU visit observations -> follow-ups, report text
  backup.js            backup file format
src/components/        shared UI pieces
src/screens/           one file per page
assets/                app icon, adaptive icon, splash image
```

## Develop (laptop)

1. Install Node.js LTS from nodejs.org
2. `npm ci` (installs exact versions from `package-lock.json`)
3. `npm test` - logic tests (Jest)
4. `npm run lint` - code checks (ESLint)
5. `npx expo start` and open in Expo Go to try it

## Build an installable APK

The build profile `preview` makes an installable .apk (not Play Store).

**Before every new build, raise `android.versionCode` in `app.json` by 1**
(and `version` for a visible change, e.g. 1.1.0 -> 1.2.0), so you can tell
which version each phone has.

### Option A: laptop
1. `npx eas-cli@latest login`        (your Expo account)
2. `npm run build:apk`
3. Wait 10-20 min. Open the link / QR on your phone -> download -> install.

### Option B: phone only (GitHub + expo.dev)
1. expo.dev -> project -> GitHub -> connect this repo
2. Build -> Android -> profile "preview" -> Build
3. When it finishes: Install / Download -> open the .apk on the phone.

Install on the phone: allow "Install unknown apps" for Chrome / Files when asked.

## Backups

Data lives only on the phone. In the app: **More -> Settings -> Backup & restore
-> Save backup file** makes one `.json` file with all data and photos; save it to
Google Drive / WhatsApp / email. **Restore from backup** on any phone puts it back.

## Notes

- `xlsx` comes from the SheetJS CDN (`cdn.sheetjs.com`), because the npm copy
  is old and has known security issues. The build machine must be able to reach
  that host.
- See `CHANGELOG.md` for what changed in each version.
