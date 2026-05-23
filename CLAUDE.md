# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-file React application — the "Lose Weight Smarter" companion app by Dr. Asif. Built as one monolithic JSX file (~4061 lines, 274KB) with no build tooling, no bundler, no external React dependencies beyond a CDN import. All state is persisted to `localStorage`.

## Architecture

Single-file SPA (`src/dr_asif_v21_app.jsx`, ~1166 lines) with inline styles. See [`docs/architecture.md`](docs/architecture.md) for full component tree, line numbers, state inventory, data flow, and StorageService API reference.

### Data Layer

- **Meal Plans**: `PLANS` object — male/female book-based meal plans with exact calories and macros
- **Personalised Calculator**: `CalcForm` uses Mifflin-St Jeor equation for BMR, activity multipliers for custom targets
- **Persistence**: `StorageService` in `src/services/storage.js` with `save`/`load`/`clearAll`/`exportAll`/`importAll`
- **State Management**: `useStorage` hook wraps `useState` + auto-persist. All state lives in `App` and is passed down via props (no Context, no external state library)
- **Storage keys**: `user.gender`, `user.profile`, `streak.weekly`, `calories.*`, `challenge.*`, `track.entries`, `coach.messages`, `community.liked`

### Design Tokens

The `T` object (lines 6-46) defines the colour palette. Deep navy primary, teal accent, gold warm accents, sage for success states.

### Key Patterns

- Mobile-first: max-width 390px container, bottom tab bar, bottom-sheet modals
- Fixed positioning for bottom nav and settings button
- Inline SVG for charts and the logo
- No routing library — `active` state string switches via `renderTab()`
- All data is book-derived (Dr. Asif's "Lose Weight Smarter" 2nd edition)

## Development

### Running the App

Built with Vite + React. Deployed to iOS/Android via Capacitor.

```bash
npm run dev          # dev server with HMR
npm run build        # production build to dist/
```

### iOS Capacitor (Makefile)

```bash
make ios-list                            # list available iOS targets
make ios-dev                             # build → sync → run (default device)
make ios-dev TARGET=00008030-00123456    # build → sync → run (specific device)
```

### Common Tasks

No test suite, no linting config.

### Android Capacitor (Makefile)

```bash
make android-list                          # list available Android targets
make android-dev                           # build → sync → run (default device)
```

### UI Testing with Screenshots

When verifying UI changes on iOS and Android simulators:

**iOS Screenshot:**
```bash
xcrun simctl io "iPhone 16 Pro" screenshot /tmp/ios-screenshot.png
open /tmp/ios-screenshot.png
```

**Android Screenshot:**
```bash
~/Library/Android/sdk/platform-tools/adb -s 127.0.0.1:6562 exec-out screencap -p > /tmp/android-screenshot.png
open /tmp/android-screenshot.png
```

Note: Android device ID may vary. Check with:
```bash
~/Library/Android/sdk/platform-tools/adb devices
```

### Adding Features

Most changes involve:
1. Modifying the `PLANS` data object for meal/nutrition data
2. Adding/editing a tab component (each gets a section in the file)
3. Adding tabs to `PRIMARY_TABS` or `MORE_TABS` arrays
4. Adding state + `useEffect` for new `localStorage` persistence

### Code Style

- Inline styles only (the `T` design tokens object)
- Multi-line JSX wrapped in parentheses
- Functional components with explicit prop destructuring
- Section comments with `// ───` separator pattern
- No TypeScript, no PropTypes

### Capacitor Configuration

`capacitor.config.json` contains plugin settings for:
- **StatusBar**: style, backgroundColor, overlaysWebView
- **SplashScreen**: launchAutoHide, backgroundColor, androidScaleType, showSpinner

StatusBar style options: `"Light"` (白色图标/文字) or `"Dark"` (黑色图标/文字)

On Android, status bar configuration is handled via Capacitor plugins. Native Android theme modifications go in `android/app/src/main/res/values/styles.xml`.
