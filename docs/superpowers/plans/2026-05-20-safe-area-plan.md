# Safe Area Plugin Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace CSS `env()` safe area handling with `capacitor-plugin-safe-area` plugin for cross-platform (iOS + Android) support with dynamic event updates.

**Architecture:** Plugin is initialized once in `App` component's `useEffect`. It fetches initial safe area insets and sets CSS custom properties (`--safe-area-inset-top`, etc.) on `document.documentElement`. A listener on `safeAreaChanged` keeps values current. All existing `env()` references are replaced with `var()` referencing these CSS variables.

**Tech Stack:** `capacitor-plugin-safe-area@latest`, vanilla CSS custom properties, React hooks

---

## File Map

| File | Responsibility |
|------|--------------|
| `package.json` | Add plugin dependency |
| `src/dr_asif_v21_app.jsx` | Plugin init + all env() → var() replacements |

---

## Tasks

### Task 1: Install Plugin

**Files:**
- Modify: `package.json` — add `capacitor-plugin-safe-area@latest` to dependencies

- [ ] **Step 1: Install plugin**

```bash
npm install capacitor-plugin-safe-area@latest
```

Expected: Plugin installs, `node_modules/capacitor-plugin-safe-area` exists

- [ ] **Step 2: Sync Capacitor**

```bash
npx cap sync
```

Expected: iOS and Android native projects updated with new plugin

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add capacitor-plugin-safe-area for cross-platform safe area"
```

---

### Task 2: Add Plugin Import

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:1-2` — add SafeArea import

- [ ] **Step 1: Add import**

Find line 1-2:
```jsx
import { useState, useEffect, useRef } from "react";
import { useGender, useUserProfile, useStreak, useCaloriesFood, useCaloriesExercise, useChallengePhase, useChallengeStarted, useChallengeChecked, useTrackEntries, useCoachMessages, useCommunityLiked } from "./services/storage";
```

Add after existing imports:
```jsx
import { SafeArea } from "capacitor-plugin-safe-area";
```

- [ ] **Step 2: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "feat: import SafeArea from plugin"
```

---

### Task 3: Add Plugin Initialization useEffect

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:1083-1085` — add useEffect for plugin in App component

- [ ] **Step 1: Add useEffect after state declarations**

Find the App component's state declarations around line 1083 (before the `return (` statement). Add:

```jsx
  // Initialize safe area plugin
  useEffect(() => {
    const updateSafeArea = async () => {
      const { insets } = await SafeArea.getSafeAreaInsets();
      for (const [key, value] of Object.entries(insets)) {
        document.documentElement.style.setProperty(
          `--safe-area-inset-${key}`,
          `${value}px`
        );
      }
    };

    updateSafeArea();

    SafeArea.addListener("safeAreaChanged", ({ insets }) => {
      for (const [key, value] of Object.entries(insets)) {
        document.documentElement.style.setProperty(
          `--safe-area-inset-${key}`,
          `${value}px`
        );
      }
    });
  }, []);
```

- [ ] **Step 2: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "feat: initialize safe area plugin with CSS variable updates"
```

---

### Task 4: Replace Inline env() with var() in JSX

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:222,375,553,679,790,838,895,929,965` — replace all inline env() references

- [ ] **Step 1: Replace all inline env() references**

Replace each occurrence using `replace_all`:

| Line | Before | After |
|------|--------|-------|
| 222 | `env(safe-area-inset-top)` | `var(--safe-area-inset-top)` |
| 375 | `env(safe-area-inset-top)` | `var(--safe-area-inset-top)` |
| 553 | `env(safe-area-inset-top)` | `var(--safe-area-inset-top)` |
| 679 | `env(safe-area-inset-top)` | `var(--safe-area-inset-top)` |
| 790 | `env(safe-area-inset-top)` | `var(--safe-area-inset-top)` |
| 838 | `env(safe-area-inset-top)` | `var(--safe-area-inset-top)` |
| 895 | `env(safe-area-inset-top)` | `var(--safe-area-inset-top)` |
| 929 | `env(safe-area-inset-top)` | `var(--safe-area-inset-top)` |
| 965 | `env(safe-area-inset-top)` | `var(--safe-area-inset-top)` |

- [ ] **Step 2: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "refactor: replace env() with var() for safe area in inline styles"
```

---

### Task 5: Replace CSS Class env() with var()

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:1096-1099,1155-1158` — replace CSS class definitions in both `<style>` blocks

- [ ] **Step 1: Replace first style block (lines 1096-1099)**

Replace:
```css
.sa-bot  { padding-bottom: max(16px, env(safe-area-inset-bottom, 16px)) !important; }
.sa-cont { height: calc(100vh - 72px - env(safe-area-inset-bottom, 0px)) !important; }
.sa-draw { bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important; }
.sa-top  { top: max(14px, env(safe-area-inset-top, 14px)) !important; }
```

With:
```css
.sa-bot  { padding-bottom: max(16px, var(--safe-area-inset-bottom, 16px)) !important; }
.sa-cont { height: calc(100vh - 72px - var(--safe-area-inset-bottom, 0px)) !important; }
.sa-draw { bottom: calc(72px + var(--safe-area-inset-bottom, 0px)) !important; }
.sa-top  { top: max(14px, var(--safe-area-inset-top, 14px)) !important; }
```

- [ ] **Step 2: Replace second style block (lines 1155-1158)**

Same replacement as Step 1 — this is a duplicate CSS block inside the Settings overlay.

- [ ] **Step 3: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "refactor: replace env() with var() in .sa-* CSS classes"
```

---

## Verification

After all tasks:
1. Run `npm run build` — should produce no errors
2. Run `npx cap sync ios && npx cap sync android` — native projects updated
3. For iOS: open `ios/App.xcworkspace` and verify plugin is linked
4. For Android: verify `MainActivity.java` or `MainActivity.kt` has the plugin available

No tests exist in this project — visual verification on simulator is the check.

---

## Spec Coverage Check

- [x] Plugin initialization on mount → Task 3
- [x] safeAreaChanged listener → Task 3
- [x] All 9 inline env() references replaced → Task 4
- [x] All 4 CSS class definitions replaced → Task 5
- [x] Both style blocks (line 1096 and 1155) updated → Task 5
- [x] No fallback (env() removed entirely) → Tasks 4 & 5
- [x] Plugin dependency added → Task 1
- [x] Capacitor sync for iOS + Android → Task 1