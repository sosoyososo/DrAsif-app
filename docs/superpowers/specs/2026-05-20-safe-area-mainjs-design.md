# Safe Area Plugin Initialization — Move to main.jsx

**Date:** 2026-05-20
**Topic:** Refactor SafeArea plugin init from App component to main.jsx

## Context

The SafeArea plugin is currently initialized inside `App`'s `useEffect`. This runs after the component mounts, potentially causing a layout shift on first render where CSS variables aren't yet set. Also, keeping plugin initialization in the React component mixes concerns — main.jsx already handles native plugin setup for StatusBar, SplashScreen, and back button.

## Design

### Move SafeArea init to main.jsx

The initialization happens before React renders, ensuring CSS variables are set before the first paint.

```jsx
// main.jsx
import { createRoot } from "react-dom/client";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { App as CapApp } from "@capacitor/app";
import { SafeArea } from "capacitor-plugin-safe-area";  // Add
import App from "./dr_asif_v21_app.jsx";

// Add before root.render()
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

### Remove from App component

Remove the `useEffect` in `dr_asif_v21_app.jsx` that was initializing the SafeArea plugin. The CSS variables are already set in main.jsx, so the App-level effect becomes redundant.

## Files to Modify

- `src/main.jsx` — add SafeArea import and initialization (before render)
- `src/dr_asif_v21_app.jsx` — remove useEffect that sets CSS variables

## Scope

Simple refactor: move ~15 lines of plugin init code from App component to main.jsx. No new functionality — same behavior, just happens earlier and follows existing pattern.