# Local Notifications — Design Spec

**Date:** 2026-06-11
**Status:** Draft (pending user review)

## Overview

Add local notifications to the Dr Asif Diet app for the three engagement-driving
reminder types called out in the brief. All scheduling is local (no server push).
Defaults, time pickers, and the toggle surface live in the existing Settings overlay;
all native scheduling and the OS permission flow live behind a dedicated service +
React hook so the existing 5,099-line single-file app stays the source of truth
for UI.

## Goals

- **Three notification types**, each independently toggleable, with sensible defaults:
  - **Food Reminder** — daily at user-selected time → opens Calories tab
  - **Exercise Reminder** — daily at user-selected time → opens Calories tab
  - **Challenge Milestone** — fire-and-forget on event → opens Challenge tab
- **One new file** for UI-unrelated business logic: `src/services/notifications.js`
- **One new hook** to keep React glue in one place: `src/hooks/useNotifications.js`
- **Minimal edits** to `src/dr_asif_v23_63_app.jsx` (≤ 6 lines in `App`, one new
  block in `SettingsScreen`, one new line in `resetAllData`)
- **No edits** to existing tabs (Home, Calories, Challenge) — the milestone
  `triggerMilestone` callback is exposed for future wiring but not called yet
- **Native config** supports iOS (no Info.plist changes needed) and Android
  12+ exact alarm + Android 13+ runtime permission

## Non-Goals

- Push notifications / server-scheduled notifications
- Rich notification actions (snooze, dismiss-with-reason) — tap-to-navigate is enough
- Per-weekday scheduling (Mon–Fri only) — daily is fine for v1
- Sound / vibration customization — rely on OS defaults
- Analytics on notification open/click — not in scope

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ src/services/notifications.js                                  │
│   • Constants: NOTIFICATION_IDS, NOTIFICATION_CONTENT,         │
│                NOTIFICATION_TAB, DEFAULT_SETTINGS              │
│   • Storage keys: STORAGE_KEY (settings), ASKED_KEY (asked)    │
│   • Permission: checkPermission, requestPermission             │
│   • Scheduling: applyFoodSchedule, applyExerciseSchedule,      │
│                 cancelFood, cancelExercise                     │
│   • Trigger: triggerMilestone(body?)                           │
│   • Lifecycle: init({ onTap })                                 │
│   • Reset: reset()                                             │
│   • Guard: isNativePlatform() — web/dev mode is a no-op        │
└────────────────────────────────────────────────────────────────┘
                              ▲
                              │ (plain function calls, no React)
                              │
┌────────────────────────────────────────────────────────────────┐
│ src/hooks/useNotifications.js                                  │
│   • useStoredState-shaped state for `settings`                 │
│   • useEffect on mount:                                        │
│       - Service.init({ onTap })                                │
│       - Service.requestPermission() (once, ref-guarded)        │
│   • Returns: { settings, setFood, setExercise,                 │
│                setChallenge, permission, triggerMilestone,     │
│                onPermissionPrompt, reset }                     │
└────────────────────────────────────────────────────────────────┘
                              ▲
                              │ (React tree)
                              │
┌────────────────────────────────────────────────────────────────┐
│ dr_asif_v23_63_app.jsx                                         │
│   App()                                                        │
│     const notif = useNotifications({ onTap: setActive })       │
│     notif.reset() called from resetAllData()                   │
│   SettingsScreen                                               │
│     Receives `notif` spread as additional props                │
│     Renders new "Notifications" section between header and     │
│     "Your Plan" section                                        │
└────────────────────────────────────────────────────────────────┘
```

## Data Model

### Persisted (via `StorageService` → `localStorage` + auto server sync)

Key: `dr_notif_settings`

```js
{
  food:      { enabled: <bool>, hour: <0-23>, minute: <0-59> },
  exercise:  { enabled: <bool>, hour: <0-23>, minute: <0-59> },
  challenge: { enabled: <bool> },
}
```

- Default value (when key absent): see `DEFAULT_SETTINGS` below
- Auto-registered in `__dr_storage_registry__`
- Auto-synced to `user_data` table via existing `writeUserData` machinery
- Wiped by `StorageService.clearAll()` and by `resetAllData()`

### Persisted (raw `localStorage` — **local only, no server sync**)

Key: `dr_notif_permission_asked`

```js
"true"  // string
```

- Written once after the first call to `requestPermissions()` regardless of result
- Read only by the Service, not used by UI
- Survives "Delete All My Data" (it's local-only, not in the registry)

### NOT persisted by us

- Scheduled notifications (held by iOS UNUserNotificationCenter / Android
  AlarmManager — we call `getPending()` to inspect, `cancel()` to remove)
- Dynamic milestone IDs (re-generated per `triggerMilestone` call)
- Current permission state (queried via `checkPermissions()` at runtime)
- Tap callback handlers (registered in-memory for app lifetime)

## Service API (`src/services/notifications.js`)

```js
export const NOTIFICATION_IDS = {
  FOOD: 1001,
  EXERCISE: 1002,
  MILESTONE_BASE: 2000,  // dynamic IDs are 2000 + (Date.now() % 1_000_000)
};

export const NOTIFICATION_CONTENT = {
  food:      { title: "Log your meals",       body: "Don't forget today's meal log." },
  exercise:  { title: "Time to move",         body: "Don't forget today's exercise." },
  challenge: { title: "🎉 Congratulations!",
               body: "You've reached a new milestone! Keep it up." },
};

export const NOTIFICATION_TAB = {
  food: "calories",
  exercise: "calories",
  challenge: "challenge",
};

export const DEFAULT_SETTINGS = {
  food:      { enabled: false, hour: 9,  minute: 0 },  // 9:00
  exercise:  { enabled: false, hour: 18, minute: 0 },  // 18:00
  challenge: { enabled: false },
};

export const NotificationService = {
  // Lifecycle
  init({ onTap }),                 // registers tap listener (idempotent)
  requestPermission(),             // shows OS prompt if not yet asked; auto-enables all 3 on first grant
  checkPermission(),               // current OS state

  // Settings (read/write)
  getSettings(),                   // returns DEFAULT_SETTINGS-shaped object
  updateSettings(newSettings),     // persists + reschedules food/exercise

  // Trigger (for future milestone wiring)
  triggerMilestone({ body? }),     // fire-and-forget; respects challenge.enabled + permission

  // Reset (called from resetAllData)
  reset(),                         // cancel all + restore DEFAULT_SETTINGS
};
```

### Permission flow (`requestPermission()`)

1. If `Capacitor.isNativePlatform() === false` → return `'denied'`, no-op
2. Call `LocalNotifications.requestPermissions()`
3. Write `ASKED_KEY = "true"` to raw `localStorage` (regardless of result)
4. If `result.display === 'granted'`:
   - Read current `dr_notif_settings`
   - If all three are at their default-disabled state → this is the first grant
   - Write `DEFAULT_SETTINGS` but with all `enabled: true`
   - Call `applyFoodSchedule` and `applyExerciseSchedule` (so the two daily
     reminders start firing immediately with default times)
5. Return `result.display`

### Schedule model

Daily reminders use `schedule.on: { hour, minute }` + `repeats: true`. The v7
plugin treats that pattern as "every day at this time" on both iOS and Android.

```js
// food reminder
{
  id: NOTIFICATION_IDS.FOOD,
  title: NOTIFICATION_CONTENT.food.title,
  body:  NOTIFICATION_CONTENT.food.body,
  schedule: { on: { hour, minute }, repeats: true },
  extra: { type: 'food' },
}
```

### Milestone trigger

```js
{
  id: NOTIFICATION_IDS.MILESTONE_BASE + (Date.now() % 1_000_000),
  title: NOTIFICATION_CONTENT.challenge.title,
  body: body || NOTIFICATION_CONTENT.challenge.body,
  schedule: { at: new Date(Date.now() + 1000) },  // fire ~1s out
  extra: { type: 'challenge' },
}
```

- Skipped silently if `challenge.enabled === false` or permission not granted
- The hook surfaces this as `triggerMilestone(opts)` to UI; UI is responsible
  for actually calling it (we don't wire it to streak/goal/phase events in v1)

### Tap handling

`init({ onTap })` registers a single `localNotificationActionPerformed` listener
that reads `notification.extra.type`, looks up `NOTIFICATION_TAB[type]`, and
calls `onTap(tabId)`. The App's `setActive` is passed in as `onTap`.

## Hook API (`src/hooks/useNotifications.js`)

```js
useNotifications({ onTap, onPermissionPrompt }) -> {
  settings:        { food, exercise, challenge },
  permission:      'prompt' | 'granted' | 'denied' | 'unsupported',
  isAsked:         boolean,
  setFood:         ({ enabled, hour, minute }) => void,
  setExercise:     ({ enabled, hour, minute }) => void,
  setChallenge:    ({ enabled }) => void,
  toggleFromUi:    (kind: 'food' | 'exercise' | 'challenge') => void,
                   // if kind requires permission, calls onPermissionPrompt() if denied
  triggerMilestone: (opts?: { body? }) => void,
  reset:           () => void,
}
```

Behaviour:

- **Mount**: `useEffect` runs once, calls `Service.init({ onTap })` and
  `Service.requestPermission()` (the latter is gated by a `useRef` so it never
  runs twice in StrictMode or after remounts)
- **Permission re-check on focus**: listens to `App.appStateChange`; if state
  becomes `active`, re-calls `Service.checkPermission()` and updates local
  `permission` state. If the new state is `granted` AND any of
  `settings.food.enabled / settings.exercise.enabled` is `true`, the hook
  immediately calls `Service.updateSettings(currentSettings)` to flush the
  pending schedules to the OS. This is the "user re-enabled in iOS Settings,
  returned to app" recovery path
- **Settings setters** call `Service.updateSettings(...)` and merge into local
  state
- **`toggleFromUi(kind)`** is the path Settings UI uses. It:
  1. Computes the new settings (flips `enabled` for `kind`)
  2. Persists + reschedules via `Service.updateSettings(newSettings)`. The
     Service internally calls `requestPermission()` if not currently granted
     (this is the only OS-sanctioned re-prompt point — after the first denial,
     it returns silently)
  3. If the post-update permission is still `denied`, calls
     `onPermissionPrompt()` — App wires this to a toast with an "Open Settings"
     button that invokes `App.openAppSettings()`. The toggle is **kept ON** in
     local state (user intent), and the "blocked" status row above the toggle
     makes the OS-level denial visible. This is the chosen behaviour — we do
     not revert the toggle, since silently flipping it back would be
     surprising

## UI Changes

### `SettingsScreen` — new "Notifications" section

Inserted between the existing header (`<div paddingTop: 24>`) and the
"Your Plan" label. Reuses existing `Card` styling and design tokens.

```
NOTIFICATIONS                                  (eyebrow label, uppercase)

┌────────────────────────────────────────────────────────────┐
│ 🍽 Food Reminder            [●○  ]   [ 09:00 ▾ ]         │
│    Daily reminder to log meals                             │
├────────────────────────────────────────────────────────────┤
│ 🔥 Exercise Reminder        [●○  ]   [ 18:00 ▾ ]         │
│    Daily reminder to log exercise                         │
├────────────────────────────────────────────────────────────┤
│ 🏆 Challenge Milestones     [●○  ]                        │
│    Celebrations when you hit a streak, goal, or phase     │
└────────────────────────────────────────────────────────────┘
─ Permission status line (conditional) ─
✓ Notifications are enabled
  (or)
⚠ Notifications are disabled on this device.
  Tap to open System Settings.
```

- **Toggle**: a minimal pill switch (existing `T.teal` / `T.border`), no new
  component, no new dependency
- **Time picker**: native `<input type="time">` — browser default look is
  acceptable inside the iOS WKWebView (renders the system time picker)
- **State derivation**: `permission === 'denied'` and `isAsked === true` →
  show "blocked" status with tappable "Open System Settings" link. That link
  calls `App.openAppSettings()` (already a dep)
- **Toast extension**: the existing `toast` state is upgraded from
  `string` to `{ message: string, action?: { label: string, onClick: () => void } | null }`
  for the permission-denied case. Other toast callsites pass `{ message: "..." }`

### `App` (root) — small additions

```js
import { useNotifications } from "./hooks/useNotifications";

// inside App():
const notif = useNotifications({
  onTap: (tabId) => setActive(tabId),
  onPermissionPrompt: (openSystemSettings) => {
    setToast({
      message: "Notifications not authorized",
      action: { label: "Open Settings", onClick: openSystemSettings },
    });
  },
});

// in resetAllData() — after localStorage wipe:
await notif.reset();
```

(`setToast` is at the App level, not inside `SettingsScreen` — or we
re-expose the toast there. Implementation detail: simplest is to give
SettingsScreen its own `permissionToast` state and a small render.)

## Native Config Changes

### `package.json`

Add to `dependencies`:

```json
"@capacitor/local-notifications": "^7.0.6"
```

(The library is already in `node_modules`; this just registers it formally so
`npm install` from a clean checkout pulls it.)

### `ios/App/App/Info.plist`

**No changes.** Local notifications scheduled via `UNUserNotificationCenter`
do not require `UIBackgroundModes` or any extra Info.plist keys. The first
call to `requestPermissions()` triggers the standard iOS permission prompt.

### `android/app/src/main/AndroidManifest.xml`

Add inside `<manifest>` (above `<application>`):

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
```

- `POST_NOTIFICATIONS` — runtime permission, prompted via `requestPermissions()` on Android 13+
- `SCHEDULE_EXACT_ALARM` — static permission, ensures daily reminders fire at the exact time on Android 12+; falls back to inexact alarm if user revokes the setting

### `capacitor.config.json`

Optional Android smallIcon (otherwise OS default is used):

```json
"plugins": {
  "LocalNotifications": {
    "smallIcon": "ic_stat_name"
  }
}
```

Skip if there's no suitable drawable; this is purely cosmetic.

## Edge Cases

| Scenario | Handling |
|---|---|
| Web / Vite dev mode | `isNativePlatform() === false` → all Service methods no-op, settings still persist to localStorage, Settings UI still renders (so a developer can verify the flow visually without a device) |
| iOS denied | Toggle flips ON in UI, scheduling is skipped, toast offers "Open System Settings" → `App.openAppSettings()` |
| Android 13+ denied | Same as iOS |
| User re-enables in OS settings | `appStateChange → active` re-runs `checkPermissions()`; if newly `granted` AND any `settings.*.enabled === true`, the hook calls `Service.updateSettings(currentSettings)` to flush pending schedules |
| App launch is after today's reminder time | `on: { hour, minute }` pattern automatically schedules for tomorrow at that time |
| `LocalNotifications.schedule()` throws | Service catches, logs `console.warn`, returns gracefully — UI state still updates so the user sees the toggle flip |
| Multiple milestones in same second | Dynamic IDs (2000 + `Date.now() % 1_000_000`) prevent collision |
| "Delete All My Data" | `resetAllData()` calls `notif.reset()` after the localStorage wipe → cancels all scheduled + restores DEFAULT_SETTINGS. The `dr_notif_permission_asked` flag survives (raw localStorage) |
| App killed and reopened | `LocalNotifications.getPending()` not consulted; we trust the OS still has them. On the rare device reset, the user can re-toggle |
| Web preview / production build | `vite build` tree-shakes `LocalNotifications` import only when `Capacitor.isNativePlatform()` is false at runtime; bundling includes it but it's a no-op in browser |

## Testing Plan

No automated test suite exists in this project (`npm test` echoes and exits).
Manual verification on simulators:

1. **Permission prompt on first launch (clean install)**
   - Delete app from simulator
   - `npm run ios-dev` (or `android-dev`)
   - Sign in, complete onboarding
   - Expect: system permission prompt appears within ~1s of landing on Home tab
   - Tap Allow → expect toast on first Home visit (optional)

2. **Auto-enable on first grant**
   - Continue from (1) after Allow
   - Open Settings (⚙ top-right)
   - Expect: "Notifications" section shows Food ON at 09:00, Exercise ON at 18:00, Challenge ON
   - iOS: `xcrun simctl ... get_app_container` → check no scheduled; or use Xcode debug → device console for the plugin log
   - For time-based verification: temporarily set food time to 1 minute ahead, send to background, wait, verify notification appears

3. **Toggle off / on**
   - In Settings, toggle Food OFF → expect: no notification fires at 09:00 the next day
   - Toggle back ON → expect: rescheduled for 09:00

4. **Time change**
   - Change food time to 14:30 → expect: old schedule cancelled (verify with `getPending()` dev hook if needed), new schedule set

5. **Denied path**
   - Reinstall, deny permission on first launch
   - Open Settings, expect: status line "Notifications are disabled — tap to open System Settings"
   - Toggle Food ON → expect: toast "Notifications not authorized" with "Open Settings" button
   - Tap → expect: iOS Settings app opens to Dr Asif Diet
   - Manually enable in iOS Settings, return to app → expect: status line clears, toggle is still ON, schedule exists

6. **Milestone trigger (manual dev hook)**
   - For now, expose a hidden dev button in the (already-existing) hidden dev
     test panel that calls `notif.triggerMilestone({ body: "Test milestone" })`
   - Or call from devtools console: `window.__notif.triggerMilestone({})`
   - Expect: notification "🎉 Congratulations!" appears within 1s, tapping it
     opens Challenge tab

7. **Reset (Delete All My Data)**
   - Toggle Food ON, confirm schedule exists
   - Settings → "Delete All My Data" → confirm
   - Expect: returns to onboarding
   - Re-onboard, open Settings → expect: Food OFF at 09:00 (defaults), no schedule, status says "enabled" (or "not asked" if OS reset it)

8. **Web dev mode**
   - `npm run dev` in browser
   - Open Settings, toggle notifications
   - Expect: toggles update localStorage; nothing fires (since no native plugin)
   - No console errors from `LocalNotifications.*` calls (they should be guarded)

## Out of Scope (Future Work)

- Wiring `notif.triggerMilestone()` calls into HomeTab (streak 7+), CaloriesTab
  (500 kcal burn goal), and ChallengeTab (phase transitions). The user wants
  to confirm exact trigger points after this work lands
- Per-weekday scheduling (e.g., exercise Mon–Fri only)
- Custom notification sounds
- Notification open / click analytics
- "Quiet hours" / Do Not Disturb window
- A "Test all three notifications now" button (could be added to the hidden
  dev panel later)

## Risks

- **iOS background fetch vs local notifications** — none; we don't use background
  fetch, just system-scheduled local notifications
- **Android 12 exact alarm revocation** — user can revoke in system settings;
  if they do, library falls back to inexact (delays possible). We don't
  surface a warning for this in v1
- **Web preview won't show real notifications** — by design; Settings UI still
  works for visual review
- **StorageService server sync includes notification settings** — yes, by design
  (the user can switch devices and keep their preferences). The local-only
  `dr_notif_permission_asked` flag is intentionally excluded
