# Changelog

## 1.1.0 (versionCode 2)

New look: frosted glass on a nature background
- Soft leaf / river / sun / moss background; cards are frosted glass with a bright rim.
- Nature colours for status: terracotta = Action, amber = Monitor, moss = Good,
  river blue = R&D. Status is always shown with an icon or word, not colour only.
- Compact top bar (back + where you are) - about 100 px more room on every page.
- Floating glass bottom bar; hidden while filling in a visit.
- Cost: the 4-column table is now one row per element with a bar centred on budget,
  worst first. Tap a row to edit in a large bottom sheet (Previous / Next).
- Estate page shows "Needs attention" (worst fields, costs over the limit,
  overdue follow-ups) before the section list.
- Stat tiles, menu rows and lists no longer cut text off with "...".
- One button style: green = main action, glass = second action (no more blue/grey).

Data safety
- Photos are copied into the app's own folder (before, they stayed in the
  phone's cache folder, which Android can empty, so photos could disappear).
- New **Backup & restore** in Settings: one JSON file with all data and photos.
- Saved data is checked when the app starts: if it cannot be read, the app
  shows a warning and does not overwrite it (a damaged copy is kept).
  Save errors (e.g. phone storage full) are shown instead of being ignored.
- The app waits until saved data is loaded before showing pages.
- Quick edits can no longer overwrite each other (all list updates use the latest data).
- "Clear all data" now also removes the stored photo files.

Fixes
- Deleting a field now goes back two pages as intended (before it only went back one).
- Phone Back button on the Estates / Visits / Priorities / More tabs goes to Home
  first instead of closing the app.

Under the hood
- `App.js` (6,000 lines) split into `src/` modules: logic, components, screens.
- `xlsx` updated to 0.20.3 from the SheetJS CDN (fixes known security issues).
- `package-lock.json` restored for repeatable builds; added `expo-asset`,
  `expo-sharing`, `expo-splash-screen`.
- Trigger limits from Settings are applied once when they change, not on every screen draw.
- App icon, adaptive icon and splash screen.
- Jest tests for trigger, cost, yield, import and backup logic (`npm test`),
  ESLint (`npm run lint`).

## 1.0.0 (v7.7)
- Bottom navigation, dashboard, step-by-step ETU visit, ranked priorities,
  profit in RM mil, region / SOU, estate report workbook import, lookup,
  photos, settings.
