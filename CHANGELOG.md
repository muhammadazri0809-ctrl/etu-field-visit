# Changelog

## 1.3.0 (versionCode 6): 20 UI details
- Skeleton loading page instead of a spinner; skeleton while a chat is read
- Every delete (estate, field, visit, assessment, observation, follow-up) shows UNDO
- Search & jump menu (top bar): estates, field codes, visits and actions; Go opens the first match
- Shortcut hints in the menu (Go key, swipe to delete, drag sheet down)
- Photos fade in over a soft placeholder and are decoded at display size (expo-image)
- Pages slide in from the side they come from; tabs fade up
- Bottom sheets (cost editor, pickers, search) drag down to close; safe-area padding
- Animations can be caught mid-way (sheets, swipe rows)
- Android predictive back gesture enabled
- Bigger touch areas (hit slop) on small buttons, chips and links
- Tabular numbers for all figures; balanced line breaks in headings; continuous corners (iOS)
- WhatsApp import keys: re-importing the same chat skips visits already imported

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

Readability & clearer priorities (design review)
- Status chips and coloured text use darker shades with bold text: 6.5:1+ contrast
  (was about 4.3:1), easier to read in sunlight. Gold headings darker too.
- Home: NEW FIELD VISIT stands alone; Upload moved to an icon in the top bar.
- Priorities: "Overdue follow-ups" box at the top matches the red tab badge;
  each field shows a bar for tonnes below budget so severity can be compared.
- Estates: profit total coloured green / red by profit vs budget, with the %.
- Visits: "Suggested next visits" lists the worst fields not visited in 30 days,
  with a one-tap Visit button.

WhatsApp import & quicker lists
- Visits -> IMPORT WHATSAPP CHAT: pick the exported .zip, or the chat .txt with its
  photos. The app reads estate names and field codes from the messages, turns each
  message into an observation (category, status, "Action:" / "Root cause:" lines),
  attaches photos sent just before or after it, and shows a preview before importing.
  Works with Android and iPhone exports, English and Malay. New estate / field names
  are created on import.
- Swipe a visit left or right to delete it, with UNDO.
- Priorities: one list, worst first. Tap an estate chip to filter, tap again for all.
  Estate-level items sit above the field list.

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
