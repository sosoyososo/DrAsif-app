# Safe Area Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CSS safe area handling so fixed-position UI elements are not clipped by iOS notch/Home Indicator or Android system bars.

**Architecture:** Inject a `<style>` tag with `env(safe-area-inset-*)` CSS classes in the App component root, then add `className` to 5 fixed-position elements. Single-pass re-style — all changes in 2 files.

**Tech Stack:** Capacitor 7, React 19, Vite 8, CSS env()

---

### Task 1: Update viewport meta tag

**Files:**
- Modify: `index.html:5`

- [ ] **Step 1: Add viewport-fit=cover**

Replace the viewport meta tag to enable iOS `env()` variables.

```diff
- <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
+ <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

- [ ] **Step 2: Verify**

Run: `head -7 index.html`
Expected: the viewport tag includes `viewport-fit=cover`

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add viewport-fit=cover for iOS safe area support"
```

---

### Task 2: Inject safe area CSS style tag

**Files:**
- Modify: `src/lose_weight_smarter_v19.jsx:3956-3957`

- [ ] **Step 1: Add `<style>` tag inside root div**

Find the root return statement (line ~3955) and add a `<style>` block right after the opening `<div>` and before the fonts `<link>`.

```jsx
return (
  <div style={{ maxWidth: 390, margin: "0 auto", minHeight: "100vh", background: T.bg, position: "relative", overflowX: "hidden" }}>
    <style>{`
      .sa-bot  { padding-bottom: max(16px, env(safe-area-inset-bottom, 16px)) !important; }
      .sa-cont { height: calc(100vh - 72px - env(safe-area-inset-bottom, 0px)) !important; }
      .sa-draw { bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important; }
      .sa-top  { top: max(14px, env(safe-area-inset-top, 14px)) !important; }
    `}</style>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Verify the `<style>` tag renders**

Run: `npm run build`
Expected: build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add src/lose_weight_smarter_v19.jsx
git commit -m "feat: inject safe area CSS env() classes"
```

---

### Task 3: Add classNames to fixed-position elements

**Files:**
- Modify: `src/lose_weight_smarter_v19.jsx` — 5 locations

- [ ] **Step 1: Content area wrapper (line ~3970)**

```diff
- <div style={{ overflowY: "auto", height: "calc(100vh - 72px)" }}>{renderTab()}</div>
+ <div className="sa-cont" style={{ overflowY: "auto" }}>{renderTab()}</div>
```

- [ ] **Step 2: Settings button wrapper (line ~3960)**

```diff
- <div style={{ position: "fixed", top: 14, right: 14, zIndex: 200, display: "flex", gap: 8 }}>
+ <div className="sa-top" style={{ position: "fixed", right: 14, zIndex: 200, display: "flex", gap: 8 }}>
```

- [ ] **Step 3: Settings page back button (line ~3917)**

```diff
- <div style={{ position: "fixed", top: 14, right: 14, zIndex: 200 }}>
+ <div className="sa-top" style={{ position: "fixed", right: 14, zIndex: 200 }}>
```

- [ ] **Step 4: More drawer (line ~3977)**

```diff
- <div style={{ position: "fixed", bottom: 72, left: "50%", ...rest }}>
+ <div className="sa-draw" style={{ position: "fixed", left: "50%", ...rest }}>
```

- [ ] **Step 5: Bottom nav (line ~4009-4014)**

```diff
- <div style={{ position: "fixed", bottom: 0, ..., padding: "6px 0 16px" }}>
+ <div className="sa-bot" style={{ position: "fixed", bottom: 0, ..., padding: "6px 0" }}>
```

- [ ] **Step 6: Build to verify**

Run: `npm run build`
Expected: build succeeds with no errors

- [ ] **Step 7: Commit**

```bash
git add src/lose_weight_smarter_v19.jsx
git commit -m "feat: add safe area classNames to fixed-position elements"
```

---

### Task 4: Build and verify on iOS simulator

**Files:**
- None (verification task)

- [ ] **Step 1: Sync and run**

```bash
npm run build && npx cap sync ios
```

Expected: sync completes successfully

- [ ] **Step 2: Run on iOS simulator**

```bash
npx cap run ios
```

Pick an iPhone with notch (iPhone 14/15/16 Pro) and verify:
1. Bottom nav has extra padding below the tab items (Home Indicator area)
2. Content area is not clipped by the bottom nav
3. Settings button is below the status bar / notch
4. More drawer appears above the bottom safe area
5. Settings page back button is below the status bar
