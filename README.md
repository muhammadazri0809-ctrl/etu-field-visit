# ETU Field Visit (Android APK project)

Files: App.js (v7), package.json, app.json, eas.json, package-lock.json.
The build profile "preview" makes an installable .apk (not Play Store).

## Option A: laptop (easiest)
1. Install Node.js LTS from nodejs.org
2. Unzip this folder, open a terminal inside it
3. npm install
4. npx eas-cli@latest login        (your Expo account: same as Snack)
5. npx eas-cli@latest build -p android --profile preview
   - "Create EAS project?" -> Yes
   - "Generate a new Android Keystore?" -> Yes
6. Wait 10-20 min. Open the link / QR on your phone -> download -> install.

## Option B: phone only (GitHub + expo.dev)
1. github.com -> New repository "etu-field-visit" (private is fine)
   -> Add file -> Upload files -> pick all the files -> Commit
2. expo.dev -> sign in -> Create project "etu-field-visit"
   -> copy the Project ID and the owner name
3. On GitHub edit app.json: inside "expo" add
   "owner": "<your expo username>",
   "extra": { "eas": { "projectId": "<project id>" } },
4. expo.dev -> project -> GitHub -> connect the repo
   -> Build -> Android -> profile "preview" -> Build
5. When it finishes: Install / Download -> open the .apk on the phone.

Install on the phone: allow "Install unknown apps" for Chrome / Files when asked.
