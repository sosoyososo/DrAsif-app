# Per-Tab Top Safe Area for Content Pages

## Motivation

Existing safe area setup (2026-05-14-safearea-design.md) handles bottom nav, settings
button, and More drawer. However, the `.sa-cont` content area lacks top safe area
padding, causing content to be clipped by the iOS status bar / Android notch on
the 8 tab pages.

Each tab has a different top element (gradient banner vs plain text header), so a
single CSS rule would not produce visually consistent results. We handle each tab
according to its own top style.

## Classification

### Group A — Gradient banner at top (background must extend into safe area)

These tabs have a full-width gradient `<div>` as their first visual element. The
gradient should continue upward into the safe area so there is no hard cut-off.
ChallengeTab's gradient div uses negative horizontal margins (`margin: "0 -18px"`);
adding paddingTop only affects the top edge, so the horizontal overflow is unchanged.

| Tab       | First element                   | Current padding on gradient div |
|-----------|---------------------------------|---------------------------------|
| Home      | `linear-gradient(135deg, …)`    | `padding: "36px 22px 28px"`     |
| Challenge | `linear-gradient(160deg, …)`    | `padding: "28px 24px 24px"`     |
| Mind      | `linear-gradient(135deg, …)`    | `padding: "28px 20px 24px"`     |

### Group B — Plain background, text header

These tabs have no decorative banner. Their first content is a LogoFull + title
inside the default `T.bg` background. The safe area should appear as transparent
top padding.

| Tab  | Wrapper padding | Title paddingTop |
|------|----------------|------------------|
| Calories | `"0 18px 110px"` | 22 |
| Track    | `"0 16px 100px"` | 22 |
| Learn    | `"0 16px 100px"` | 22 |
| Community| `"0 16px 100px"` | 24 |
| Coach    | `"20px 18px 8px"` (flex layout) | — |

## Changes

### Group A — Gradient tabs

Add `paddingTop: "env(safe-area-inset-top)"` to the gradient `<div>` of each tab.

| File | Line | Element | Change |
|------|------|---------|--------|
| HomeTab | 948 | gradient div | Add `paddingTop: env(safe-area-inset-top)` to existing inline style |
| ChallengeTab | 1380 | gradient div | Add `paddingTop: env(safe-area-inset-top)` to existing inline style |
| MindTab | 3267 | gradient div | Add `paddingTop: env(safe-area-inset-top)` to existing inline style |

### Group B — Plain tabs

Add `env(safe-area-inset-top)` to the `paddingTop` of the title header `<div>`.

| File | Line | Element | Current paddingTop | New value |
|------|------|---------|-------------------|-----------|
| CaloriesTab | 1921 | header div | 22 | `calc(22px + env(safe-area-inset-top))` |
| TrackTab | 2383 | title div | 22 | `calc(22px + env(safe-area-inset-top))` |
| LearnTab | 2880 | logo div | 22 | `calc(22px + env(safe-area-inset-top))` |
| CommunityTab | 2993 | header div | 24 | `calc(24px + env(safe-area-inset-top))` |
| CoachTab | 2808 | header div | 20 | `calc(20px + env(safe-area-inset-top))` |

## Implementation Notes

- `env(safe-area-inset-top)` returns 0 on devices without a notch / in web browsers,
  so these changes are no-ops outside of iOS/Android Capacitor builds.
- For Group A, adding padding to the gradient div keeps the gradient continuous
  — no visual seam.
- For ChallengeTab, the gradient div uses `margin: "0 -18px"`. The added padding
  only affects the top edge, so horizontal margins are unchanged.
- CoachTab uses a flex / `height: calc(100vh - 130px)` layout — the padding is
  added to its fixed-height header, not the scrollable chat area.

## Files Modified

- `src/lose_weight_smarter_v19.jsx` — ~8-10 lines across 8 tab components

## Not Modified

- SplashScreen, OnboardingScreen, SettingsScreen — handled by existing `.sa-top` class
- Bottom nav, More drawer, settings button — already handled by existing safe area setup
