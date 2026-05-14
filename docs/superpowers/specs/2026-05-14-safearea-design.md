# Safe Area Setup for iOS and Android

## Overview

Add CSS safe area handling to the Capacitor app so that fixed-position UI elements
(bottom nav, content area, settings button, More drawer) are not clipped by
iOS notch / Home Indicator or Android system bars.

## Approach: CSS env() + className

Inject `<style>` rules using `env(safe-area-inset-*)` and apply them via
`className` on affected elements. Minimal code changes, zero runtime overhead.

## Changes

### 1. index.html — viewport meta

Add `viewport-fit=cover` to enable iOS `env()` variables:

```diff
- <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
+ <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

### 2. App component — inject `<style>` tag

Add inside the root `<div>` (before the settings button):

```css
.sa-bot   { padding-bottom: max(16px, env(safe-area-inset-bottom, 16px)) !important; }
.sa-cont  { height: calc(100vh - 72px - env(safe-area-inset-bottom, 0px)) !important; }
.sa-draw  { bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important; }
.sa-top   { top: max(14px, env(safe-area-inset-top, 14px)) !important; }
```

### 3. Element className changes (5 locations)

| Element | Line | Change |
|---------|------|--------|
| Content area wrapper | 3970 | Add `className="sa-cont"`, remove `height` from inline style |
| Bottom nav | 4009-4014 | Add `className="sa-bot"`, change `padding: "6px 0 16px"` → `padding: "6px 0"` |
| Settings button wrapper | 3960 | Add `className="sa-top"`, remove `top` from inline style |
| More drawer | 3977 | Add `className="sa-draw"`, remove `bottom` from inline style |
| Settings page back button | 3917 | Add `className="sa-top"`, remove `top` from inline style |

### Files modified

- `index.html` — 1 line changed
- `src/lose_weight_smarter_v19.jsx` — ~15 lines changed across 5 locations

### Not modified

- SplashScreen / OnboardingScreen — full-screen layouts with own backgrounds,
  no fixed-position content that conflicts with system bars
