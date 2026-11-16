# Screenlist mobile

A React Native client for the existing Screenlist Express/MongoDB API. Expo Router provides native stack navigation for the watchlist, movie details, add/edit form, and About screen. The web preview uses the same components.

## Run from the production branch

Use Node.js 22.18 or newer and npm. From the repository root:

```sh
git checkout production
cd mobile
npm ci
npm start
```

The native app defaults to the deployed HTTPS API at `https://screenlist-three.vercel.app/api`. No database credentials are needed by the mobile app. To use another API, copy `.env.example` to `.env` and change `EXPO_PUBLIC_API_URL`. This value is public; never put secrets in it. Restart Expo after changing it.

This project uses Expo SDK 58 and its matching React Native dependencies. Use an SDK-58-compatible Expo Go client when available, or a development build. If your installed Expo Go supports only SDK 57, do not try to load this project into it. With Xcode and CocoaPods installed on macOS, run `npx expo run:ios`; with Android Studio, the Android SDK, and a running emulator, run `npx expo run:android`. Those commands generate and compile the native projects, which are excluded from the source archive. Physical iOS development builds require signing setup.

For local browser development, run the root Express server first, then set `EXPO_PUBLIC_API_URL=/api` and provide a same-origin proxy, or use the deployed web preview below. Native clients do not require browser CORS headers.

## Live preview

`https://screenlist-three.vercel.app/mobile/`

The root Vercel build exports the React Native web client under `/mobile`, alongside the existing website and API. Web requests use `/api` on that same origin. All clients share the same collection. No authentication or offline synchronization is implemented.

## Checks

```sh
npm test
npm run typecheck
npm run export
```

The request tests cover create/update methods and payloads, pagination, record retrieval, empty delete responses, server errors, malformed responses, network failure, timeouts, cancellation, and input validation. The export compiles JavaScript bundles for iOS, Android, and web; it is not a signed native application build or a substitute for device testing.

Manual verification: add a uniquely named test movie, open its details, edit all fields and status, reload, cancel a removal, then confirm removal. Check required fields, a missing record, navigation back to the list, paging past 12 records, keyboard behavior, and retry after disconnecting. Only remove records created for the test. After an uncertain timeout, refresh before retrying a write to avoid duplicates.

## Structure

- `app/`: route screens and native stack layout.
- `src/api.ts`: typed request contract, timeout/cancellation handling, and input checks.
- `src/client.ts`: platform-specific API URL selection.
- `src/ui.tsx`: shared controls, typography, and colors.
- `test/`: request behavior tests with injected fetch responses.

List rows are memoized and use stable ID keys. Focused screens fetch current server data, abort reads when leaving, and refresh after edits. Mutations are not automatically retried. Forms preserve entered text when a request fails.
