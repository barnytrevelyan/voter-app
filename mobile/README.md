# What's It To Me? — phone app (mobile/)

Expo (React Native, SDK 57) app for iOS and Android. App ID on both stores: `org.whatsittome.app`.
Plan and decisions: `APP-PLAN-2026-10-12.md` in the UKPolitcs folder (and the Claude project).

## Version 0.1.0 (first test build)

One screen: postcode → the elections at that address → tap one to open the ballot page on whatsittome.org in an
in-app browser. The postcode goes once to `POST https://whatsittome.org/api/app/v1/elections` (app/api/app/v1/elections/route.ts
in the website) and is never stored. Purpose: get a real build into Google Play's closed test and TestFlight so the
14-day tester clock can start while the native screens are built.

**The website route must be deployed to Netlify before the app can find elections.**

## Run it

```bash
cd mobile
npm install
npx expo start            # then press i (iOS simulator) or a (Android emulator), or scan the QR with Expo Go
```

## iOS build (Xcode, as before)

```bash
npx expo run:ios --configuration Release   # generates ios/ and builds
open ios/WhatsItToMe.xcworkspace           # name may differ: open the .xcworkspace inside ios/
```
In Xcode: Signing & Capabilities → your team; Product → Archive → Distribute App → App Store Connect → upload.
Then add testers in TestFlight. `ios/` and `android/` are generated (Continuous Native Generation) and git-ignored: change
native settings in `app.json`, never in those folders.

## Android build for Google Play

Simplest is Expo's cloud build, which creates and keeps the upload key:
```bash
npx eas-cli@latest login            # free expo.dev account
npx eas-cli@latest build -p android --profile production   # produces an .aab
```
Upload the .aab in Play Console → Test and release → Testing → Closed testing → create a track → add the 12+ testers
(their Google account emails, or a Google Group) → roll out. Testers must opt in and stay in for 14 days in a row.
Bump `android.versionCode` and `ios.buildNumber` in `app.json` for every new upload.

## Checks before any upload

```bash
npx tsc --noEmit && CI=1 npx expo lint && npx expo-doctor
```

## Icons

Made from public/brand/mark-light.png (240 px), upscaled, so they are slightly soft. Before the public release, replace
`assets/icon.png` and the `android-icon-*` files with a 1024 px export from the logo master.

## Keeping the website and the app in step

- The contract is `lib/appApi.ts` in the website: reply shapes, `APP_API_PATH` (/api/app/v1), `MIN_APP_VERSION` and
  `LATEST_APP_VERSION`. The app imports its types only (`import type`), so no website code enters the app.
- Within v1, only add optional fields. A breaking change means `app/api/app/v2/` with v1 kept running.
- Content and data stay on the website, never in the app, so website updates reach the app with no store release.
- On launch the app reads `/api/app/v1/meta`. If its version is below `minAppVersion` it shows a must-update notice and
  stops searching; below `latestAppVersion` it shows a gentle update line. When a release goes out, raise
  `LATEST_APP_VERSION` (and fill in `storeUrls` in app/api/app/v1/meta/route.ts once the store listings are public).
- `.github/workflows/app-contract.yml` type-checks and tests both sides on every PR, and checks the live site daily.
