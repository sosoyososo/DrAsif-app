# Safe Area Init Refactor — Move to main.jsx Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move SafeArea plugin initialization from App component to main.jsx for earlier execution and cleaner separation of concerns.

**Architecture:** Add SafeArea import and async init function to main.jsx, placed before React renders. Remove the redundant useEffect from App component.

**Tech Stack:** `capacitor-plugin-safe-area`, vanilla JS, React

---

## File Map

| File | Responsibility |
|------|--------------|
| `src/main.jsx` | Add SafeArea import and init before render |
| `src/dr_asif_v21_app.jsx` | Remove useEffect that sets CSS variables |

---

## Tasks

### Task 1: Add SafeArea init to main.jsx

**Files:**
- Modify: `src/main.jsx` — add SafeArea import and initialization

- [ ] **Step 1: Add import**

Find line 4 in `src/main.jsx`:
```jsx
import { App as CapApp } from "@capacitor/app";
```

Add after it:
```jsx
import { SafeArea } from "capacitor-plugin-safe-area";
```

- [ ] **Step 2: Add init function and call**

Find lines 15-16:
```jsx
StatusBar.setStyle({ style: Style.Light });
SplashScreen.hide();
```

Add before those lines:
```jsx
const initSafeArea = async () => {
  const { insets } = await SafeArea.getSafeAreaInsets();
  for (const [key, value] of Object.entries(insets)) {
    document.documentElement.style.setProperty(
      `--safe-area-inset-${key}`,
      `${value}px`
    );
  }

  SafeArea.addListener("safeAreaChanged", ({ insets }) => {
    for (const [key, value] of Object.entries(insets)) {
      document.documentElement.style.setProperty(
        `--safe-area-inset-${key}`,
        `${value}px`
      );
    }
  });
};
initSafeArea();
```

- [ ] **Step 3: Commit**

```bash
git add src/main.jsx
git commit -m "feat: move safe area init to main.jsx for early execution"
```

---

### Task 2: Remove SafeArea useEffect from App

**Files:**
- Modify: `src/dr_asif_v21_app.jsx` — remove the SafeArea plugin useEffect

- [ ] **Step 1: Find and remove the useEffect**

Find this block in the App component (added in a previous commit):
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

Delete the entire block (including the comment `// Initialize safe area plugin`).

- [ ] **Step 2: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "refactor: remove redundant safe area useEffect from App"
```

---

## Verification

1. Run `npm run build` — should produce no errors
2. Run `npx cap sync` — native projects updated
3. Verify no remaining `SafeArea` references in `dr_asif_v21_app.jsx`:
   ```bash
   grep -n "SafeArea" src/dr_asif_v21_app.jsx
   ```
   Expected: nothing found (SafeArea import was already removed in Task 2)

---

## Spec Coverage Check

- [x] Move init to main.jsx → Task 1
- [x] Remove useEffect from App → Task 2
- [x] CSS variables still set on change → Task 1 (safeAreaChanged listener still present)
- [x] Same behavior, just earlier → Tasks 1 & 2