# Vite React Migration — Lose Weight Smarter App

## Objective

Migrate the existing single-file React application (`lose_weight_smarter_v19.jsx`) from a Babel-standalone CDN setup to a proper Vite + React build pipeline.

## Motivation

The current app is a single `.jsx` file (4061 lines, ~275KB) that relies on Babel standalone CDN for runtime JSX transformation. This requires an `index.html` with multiple CDN script tags (`react`, `react-dom`, `babel-standalone`), has no build step, and cannot utilize proper module resolution or HMR during development. A Vite-based setup provides fast dev server with HMR, production bundling with tree-shaking, and standard ES module imports.

## Project Structure

```
/DrAsif/
├── index.html              # Vite entry point
├── vite.config.js          # Vite config with React plugin
├── package.json            # Dependencies and scripts
├── .gitignore              # node_modules, dist, etc.
├── CLAUDE.md               # Existing project guidance (keep)
├── docs/
│   └── superpowers/specs/  # Design docs
├── src/
│   ├── main.jsx            # Entry point: render App to DOM
│   └── lose_weight_smarter_v19.jsx  # Existing app code (monolithic, unchanged)
```

## Migration Steps

### 1. Project Initialization
- Run `npm init -y` to create `package.json`.
- Install dependencies: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`.
- Create `vite.config.js` with the React plugin.
- Create `.gitignore` excluding `node_modules/`, `dist/`, `.claude/`, `.playwright-mcp/`.

### 2. Entry Point
- Create `src/main.jsx` that imports `App` from the JSX file and renders it with `createRoot`.
- Use `React.createElement(App)` in the render call (no JSX needed in the thin entry).

### 3. Index HTML
- Create Vite-style `index.html` at the project root with:
  - Viewport meta tag for mobile.
  - Google Fonts preconnect/links (`DM Sans`, `Cormorant Garamond`).
  - `<div id="root"></div>`.
  - `<script type="module" src="/src/main.jsx">`.
  - Inline CSS reset.

### 4. JSX File Migration
- Move `lose_weight_smarter_v19.jsx` into `src/`.
- No code changes to the JSX file itself (the existing imports and exports work with Vite).
- Vite's React plugin handles JSX transform via the automatic runtime — no explicit `import React from 'react'` needed.

### 5. Cleanup
- Delete the temporary `index.html` that was created during the initial browser-testing phase.
- Remove any other temporary or generated files not needed in the Vite setup.

### 6. Verification
- Run `npm run dev` and confirm the dev server starts.
- Open the browser and verify the app renders: splash screen → onboarding → tabs.
- Confirm all tabs (Home, Challenge, Calories, Track, Coach, Learn, Community, Mind) are functional.
- Confirm `localStorage` persistence still works (existing data preserved).

## Considerations

- **Existing data**: localStorage keys (`dr_gender`, `dr_streak`, `dr_profile`, etc.) are unchanged. User data persists across the migration.
- **No feature changes**: This is purely an infrastructure migration. The app's behavior, UI, and data model remain identical.
- **Monolithic file**: The single-file structure is preserved. Future refactoring into component files is out of scope.
- **Browser support**: Vite dev server supports modern browsers only. Production build can target broader range via `build.target` in config.

## Future (Out of Scope)

- Splitting the monolithic file into component modules.
- Adding TypeScript.
- Adding testing framework.
- Adding CSS modules or Tailwind.
- Any feature additions or UI changes.
