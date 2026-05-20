# Safe Area Plugin Integration Design

**Date:** 2026-05-20
**Topic:** Integrate `capacitor-plugin-safe-area` for cross-platform safe area handling

## Context

The app currently uses CSS `env(safe-area-inset-*)` for iOS safe area handling. This approach:
- Only works on iOS (not Android navigation bar)
- Is hardcoded with no dynamic updates
- Has both CSS classes (`.sa-top`, `.sa-bot`, `.sa-cont`, `.sa-draw`) and inline `calc()` styles scattered throughout

The `capacitor-plugin-safe-area` plugin provides native safe area values for both iOS and Android, with real-time change events.

## Design

### Plugin Initialization

Initialize the plugin once in the `App` component's `useEffect`:

```jsx
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

  SafeArea.addListener('safeAreaChanged', ({ insets }) => {
    for (const [key, value] of Object.entries(insets)) {
      document.documentElement.style.setProperty(
        `--safe-area-inset-${key}`,
        `${value}px`
      );
    }
  });
}, []);
```

### CSS Variable Mapping

Plugin provides: `{ top, right, bottom, left }` (in pixels, no unit)

Set on `document.documentElement` as:
- `--safe-area-inset-top: 47px`
- `--safe-area-inset-right: 0px`
- `--safe-area-inset-bottom: 34px`
- `--safe-area-inset-left: 0px`

### Migration: Replace `env()` with CSS variables

**Inline styles** — replace:
```jsx
// Before
style={{paddingTop:"calc(36px + env(safe-area-inset-top))"}}

// After
style={{paddingTop:"calc(36px + var(--safe-area-inset-top))"}}
```

All 4 directions (top, right, bottom, left) will be migrated where applicable.

**CSS class definitions** — replace in `<style>` block:
```css
/* Before */
.sa-bot  { padding-bottom: max(16px, env(safe-area-inset-bottom, 16px)) !important; }
.sa-cont { height: calc(100vh - 72px - env(safe-area-inset-bottom, 0px)) !important; }
.sa-draw { bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important; }
.sa-top  { top: max(14px, env(safe-area-inset-top, 14px)) !important; }

/* After */
.sa-bot  { padding-bottom: max(16px, var(--safe-area-inset-bottom, 16px)) !important; }
.sa-cont { height: calc(100vh - 72px - var(--safe-area-inset-bottom, 0px)) !important; }
.sa-draw { bottom: calc(72px + var(--safe-area-inset-bottom, 0px)) !important; }
.sa-top  { top: max(14px, var(--safe-area-inset-top, 14px)) !important; }
```

### Scope of Changes

**Install:**
- Add `capacitor-plugin-safe-area@latest` to `package.json`
- Run `npx cap sync`

**Files to modify:**
- `package.json` — add plugin
- `src/dr_asif_v21_app.jsx` — plugin init + all `env()` references replaced

**CSS variables replacing env() references:**
| Inline styles (approx 12 locations) | CSS classes (4 classes) |
|--------------------------------------|------------------------|
| `env(safe-area-inset-top)` | `.sa-top` top value |
| `env(safe-area-inset-bottom)` | `.sa-bot` padding-bottom |
| | `.sa-cont` height |
| | `.sa-draw` bottom |

### Events Handled

- **On mount:** Get initial insets and apply
- **On change:** `safeAreaChanged` event updates CSS variables (handles keyboard, rotation, foldable)

### No Fallback

`env()` is removed entirely. Plugin provides values for all Capacitor platforms (iOS + Android).