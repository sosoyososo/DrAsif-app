# Vite React Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the single-file Babel-standalone React app to a Vite + React build pipeline.

**Architecture:** Create a standard Vite React project in the same directory. Move the existing 4061-line JSX file into `src/` as a monolithic module. Use `@vitejs/plugin-react` for JSX transform. The project root `index.html` becomes Vite's entry point, and `src/main.jsx` bootstraps the App component.

**Tech Stack:** Vite 5, React 18, @vitejs/plugin-react, npm

---

### Task 1: Initialize package.json and Install Dependencies

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create package.json**

Run:
```bash
cd /Users/karsa/Downloads/upwork/DrAsif
npm init -y
```

- [ ] **Step 2: Install React, Vite, and plugin**

Run:
```bash
npm install react react-dom
npm install --save-dev vite @vitejs/plugin-react
```

- [ ] **Step 3: Add dev script to package.json**

Edit `package.json` — add the `"scripts"` section after `"main"`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 4: Verify install**

Run: `ls node_modules/.package-lock.json` — confirm `node_modules/` exists.

---

### Task 2: Create Vite Config

**Files:**
- Create: `vite.config.js`

- [ ] **Step 1: Write vite.config.js**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

---

### Task 3: Create .gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Write .gitignore**

```
node_modules
dist
.claude
.playwright-mcp
.DS_Store
*.local
```

---

### Task 4: Set Up src/ Directory

**Files:**
- Create: `src/`
- Move: `lose_weight_smarter_v19.jsx` → `src/lose_weight_smarter_v19.jsx`

- [ ] **Step 1: Create src/ and move the JSX file**

```bash
mkdir -p /Users/karsa/Downloads/upwork/DrAsif/src
mv /Users/karsa/Downloads/upwork/DrAsif/lose_weight_smarter_v19.jsx /Users/karsa/Downloads/upwork/DrAsif/src/lose_weight_smarter_v19.jsx
```

- [ ] **Step 2: Verify the file moved**

Run: `ls -la /Users/karsa/Downloads/upwork/DrAsif/src/`
Expected: `lose_weight_smarter_v19.jsx` listed.

---

### Task 5: Create Main Entry Point

**Files:**
- Create: `src/main.jsx`

- [ ] **Step 1: Write src/main.jsx**

```jsx
import { createRoot } from "react-dom/client";
import App from "./lose_weight_smarter_v19.jsx";

const root = createRoot(document.getElementById("root"));
root.render(<App />);
```

No explicit `import React from 'react'` needed — `@vitejs/plugin-react` uses the automatic JSX runtime, and `react-dom/client` is the only import required for mounting. The App component file already imports `useState`, `useRef`, `useEffect` from `"react"`.

---

### Task 6: Create Vite-Style index.html

**Files:**
- Create: `index.html` (Vite-style, replacing the temporary one from earlier)

- [ ] **Step 1: Write index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#0F2D4A" />
  <title>Lose Weight Smarter — Dr. Asif</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>❤️</text></svg>" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;700&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root {
      width: 100%; height: 100%;
      font-family: 'DM Sans', sans-serif;
      background: #F4F6F9;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

Key differences from a Babel-standalone setup:
- No `<script src="unpkg.com/react/...">` CDN tags — Vite resolves these from `node_modules`
- No Babel standalone script — Vite handles JSX at build time
- `<script type="module" src="/src/main.jsx">` — Vite serves this as an ES module

---

### Task 7: Clean Up Temporary Files

**Files:**
- Delete: the old temporary `index.html` (the one from the Babel-testing phase, overwritten by Task 6)

- [ ] **Step 1: Confirm the old testing files are gone**

The new `index.html` from Task 6 overwrote the old one. Run:
```bash
cd /Users/karsa/Downloads/upwork/DrAsif
ls
```

Check that only these project files exist: `index.html`, `package.json`, `vite.config.js`, `.gitignore`, `src/`, `node_modules/`, `CLAUDE.md`, `docs/`, `.claude/`, `.playwright-mcp/`.

---

### Task 8: Run Dev Server and Verify

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/karsa/Downloads/upwork/DrAsif
npx vite --port 5173
```

Run this in the background.

Wait for the output showing the local URL (typically `http://localhost:5173`).

- [ ] **Step 2: Verify app renders in browser**

Open `http://localhost:5173` in the browser and confirm:
- Splash screen appears (heart-pulse logo, "DA Diet" branding)
- After splash, gender selection onboarding shows
- All tabs render correctly (Home, Challenge, Calories, Track, Coach, Learn, Community, Mind)
- No console errors in browser dev tools
- localStorage persistence works (existing data from Babel-standalone sessions is accessible)

- [ ] **Step 3: Check for console errors**

Run: Check browser console for any errors. Expected: no errors related to React, module loading, or JSX transform.

---

### Task 9: Final Verification

- [ ] **Step 1: Kill the dev server**

```bash
pkill -f "vite --port 5173" || true
```

- [ ] **Step 2: Run a production build check**

```bash
cd /Users/karsa/Downloads/upwork/DrAsif
npx vite build
```

Expected output: build succeeds with no errors, output written to `dist/` directory.

- [ ] **Step 3: Verify dist output**

Run: `ls dist/`
Expected: `index.html`, `assets/` directory with chunked JS and CSS files.
