# Safe Area Top Fix — All 9 Tabs

## Motivation

The `SafeArea` plugin is initialized in `main.jsx` and sets CSS custom properties
(`--sa-top`, `--sa-bottom`, `--sa-left`, `--sa-right`) on `document.documentElement`.
The bottom nav already uses `env(safe-area-inset-bottom)` (L4746). All 9 tab content
areas are missing top safe area padding, causing content to be clipped by the iOS
status bar / Android notch.

## Background

- **main.jsx**: sets `--sa-*` CSS vars; already done
- **Bottom nav**: `env(safe-area-inset-bottom)` applied at L4746 — already correct
- **9 tabs**: all need top safe area fix

## Tab Classification

### Group A — Gradient banner at top (background must extend into safe area)

Gradient should continue upward into the safe area with no hard cut-off.

| Tab | Line | Gradient div style |
|----|------|-------------------|
| HomeTab | 957 | `background: linear-gradient(135deg, #0F2D4A …)`, `padding: "36px 22px 28px"` |
| ChallengeTab | ~1392 | `background: linear-gradient(160deg, #0F2D4A …)`, `padding: "28px 24px 24px"` |
| FoodGuideTab | 2862 | `background: linear-gradient(135deg,#0F2D4A …)`, `padding: "28px 20px 24px"` |
| MindTab | 3852 | `background: linear-gradient(135deg, #3D2A5E …)`, `padding: "28px 20px 24px"` |

### Group B — Plain background, text header

Safe area appears as transparent top padding over the default `T.bg` background.

| Tab | Line | Element | Current padding |
|----|------|---------|----------------|
| CaloriesTab | 1933 | outer wrapper div | `"0 18px 110px"` |
| TrackTab | 3094 | outer wrapper div | `"0 16px 100px"` |
| LearnTab | 3461 | outer wrapper div | `"0 16px 100px"` |
| CommunityTab | 3537 | outer wrapper div | `"0 16px 100px"` |
| CoachTab | 3395 | header div | `"20px 18px 8px"` |

## Changes

### Group A — Add `paddingTop: "env(safe-area-inset-top)"` to gradient div

| Tab | Line | Current | Change |
|----|------|---------|--------|
| HomeTab | 957 | `padding: "36px 22px 28px"` | → `padding: "calc(36px + env(safe-area-inset-top)) 22px 28px"` |
| ChallengeTab | ~1392 | `padding: "28px 24px 24px"` | → `padding: "calc(28px + env(safe-area-inset-top)) 24px 24px"` |
| FoodGuideTab | 2862 | `padding: "28px 20px 24px"` | → `padding: "calc(28px + env(safe-area-inset-top)) 20px 24px"` |
| MindTab | 3852 | `padding: "28px 20px 24px"` | → `padding: "calc(28px + env(safe-area-inset-top)) 20px 24px"` |

### Group B — Add `paddingTop: "env(safe-area-inset-top)"` to wrapper/header div

| Tab | Line | Current | Change |
|----|------|---------|--------|
| CaloriesTab | 1933 | `padding: "0 18px 110px"` | → `padding: "env(safe-area-inset-top) 18px 110px"` |
| TrackTab | 3094 | `padding: "0 16px 100px"` | → `padding: "env(safe-area-inset-top) 16px 100px"` |
| LearnTab | 3461 | `padding: "0 16px 100px"` | → `padding: "env(safe-area-inset-top) 16px 100px"` |
| CommunityTab | 3537 | `padding: "0 16px 100px"` | → `padding: "env(safe-area-inset-top) 16px 100px"` |
| CoachTab | 3395 | `padding: "20px 18px 8px"` | → `padding: "calc(20px + env(safe-area-inset-top)) 18px 8px"` |

## Notes

- `env(safe-area-inset-top)` returns 0 on devices without a notch / in web browsers,
  so these changes are no-ops outside of iOS/Android Capacitor builds.
- For Group A gradient divs, the gradient `background` is already full-width
  (no horizontal margin tricks like ChallengeTab's `margin: "0 -18px"`), so adding
  top padding keeps the gradient continuous — no visual seam.
- For CaloriesTab, the outer `<div>` (L953) has both the padding and `background: T.bg`.
  Adding top env() padding here shifts all content down, which is correct.
- CoachTab uses `height: "calc(100vh - 130px)"` flex layout — the padding is added to
  the fixed header div (not the scrollable chat area), so the layout is unaffected.

## Files Modified

- `src/dr_asif_v23_app.jsx` — ~9 lines across 9 tab components

## Not Modified

- SplashScreen, OnboardingScreen, SettingsScreen — handled separately
- Bottom nav — already has `env(safe-area-inset-bottom)`
- `main.jsx` SafeArea init — already done