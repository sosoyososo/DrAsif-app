# Delete My Data — Design Spec

**Date**: 2026-05-24
**Status**: Approved

## Summary

Add a "Delete My Data" button to the Settings panel with a two-step confirmation flow. On confirm, all user data is cleared via `StorageService.clearAll()`, App state is reset, and the user returns to the Onboarding screen.

## UI Design

### Trigger Button

- Placement: new `Card` section at the bottom of SettingsPanel, below the Medical Disclaimer card
- Style: secondary/danger button — outlined with `T.alert` border and text
- Text: "Delete My Data"
- Full width, matches existing action button dimensions (`padding:11px 0, borderRadius:11, fontSize:13`)

### Confirmation Box

Reuses the existing `conf` state pattern from SettingsPanel (`conf="del"`).

- Container: `background:T.alertL, borderRadius:11, padding:13, border:1px solid T.alert25`
- Icon + Title: "Delete All Your Data?" (`fontSize:13, fontWeight:600, color:T.navy, textAlign:center`)
- Description: "This will permanently delete all your progress, logs, challenge records, messages, and settings. This action cannot be undone." (`fontSize:12, color:T.mid, textAlign:center, lineHeight:1.5`)
- Cancel button: standard secondary (`bg:T.surface, border, color:T.mid`)
- Confirm button: destructive (`bg:T.alert, color:#fff, fontWeight:700`), text: "Yes, Delete All"

## Behavior

1. User taps "Delete My Data" → `conf` set to `"del"`, confirmation box appears in place of the button
2. User taps "Cancel" → `conf` set to `null`, button returns
3. User taps "Yes, Delete All" → three things happen:
   a. `StorageService.clearAll()` — removes all STORAGE_KEYS from localStorage
   b. `onDeleteAll()` callback — App sets `gender = null`, `userProfile = null`, closes settings
   c. Since `gender` becomes `null`, App renders `<Onboarding>` (initial state)

## Implementation

### Files changed

**`src/dr_asif_v21_app.jsx`** — two changes:

1. **SettingsPanel** (L957): Add new `conf="del"` state handling + trigger button + confirmation UI
2. **App** (L1053): Pass `onDeleteAll` callback to SettingsPanel that calls `StorageService.clearAll()` and resets state

### Props change

`SettingsPanel` gains one prop: `onDeleteAll` — callback invoked after confirmation.

### No new dependencies. No new files.

## Edge Cases

- If `localStorage` is already empty, `clearAll()` is a no-op — safe
- Toast message after deletion is unnecessary (user immediately sees Onboarding)
- Other state in child components (calories, challenge, etc.) is stored via `useStorage` hooks — clearing localStorage + remounting Onboarding effectively resets everything
