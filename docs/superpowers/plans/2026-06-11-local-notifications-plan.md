# Local Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three local notification types (daily food/exercise reminders + challenge milestone) using `@capacitor/local-notifications`, with a Settings UI to toggle and time-pick, and full iOS/Android permission handling. Two new files (`src/services/notifications.js` and `src/hooks/useNotifications.js`); minimal edits to the single-file `dr_asif_v23_63_app.jsx`.

**Architecture:** Service module owns all native scheduling, permission flow, and storage. Helper hook consumes the Service and exposes a React-friendly API. App-level code calls the hook once and threads its return value into the SettingsScreen as a new "Notifications" section. No edits to existing tabs (HomeTab, CaloriesTab, ChallengeTab) in this plan — milestone triggers are exposed via the hook for future wiring.

**Tech Stack:** Capacitor 7 + `@capacitor/local-notifications@^7.0.6` (already in node_modules; needs `package.json` registration), `@capacitor/app@^7.1.2` (already a dep — used for `openAppSettings`), React 19, Vite 8, plain `localStorage` + `StorageService`.

**Verified Spec:** `docs/superpowers/specs/2026-06-11-local-notifications-design.md`

**Testing note:** This project has no test framework (`npm test` echoes and exits). Verification is `npm run build` (syntax) + manual checks on iOS/Android simulators per `CLAUDE.md` instructions. The plan marks verification steps as `verify:` rather than `test:` to make this explicit.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `package.json` | modify | Add `@capacitor/local-notifications` to `dependencies` |
| `android/app/src/main/AndroidManifest.xml` | modify | Add `POST_NOTIFICATIONS` + `SCHEDULE_EXACT_ALARM` |
| `src/services/notifications.js` | **create** | All native scheduling, permission flow, settings persistence, milestone trigger, reset |
| `src/hooks/useNotifications.js` | **create** | React glue: state sync, mount/init, appStateChange re-check, toggles |
| `src/dr_asif_v23_63_app.jsx` | modify | One `useNotifications` call in `App`, extend toast state in `SettingsScreen`, insert new "Notifications" section, call `notif.reset()` in `resetAllData` |
| iOS `Info.plist`, `capacitor.config.json` | **no changes** | Local notifications need no iOS Info.plist keys; we skip the optional Android smallIcon |

---

## Task 1: Register the dependency

**Files:**
- Modify: `package.json:23-35`

- [ ] **Step 1: Edit `package.json` to add the dependency**

In the `dependencies` block of `/Users/karsa/Downloads/upwork/DrAsif/package.json`, insert this line in alphabetical order (between `@capacitor/ios` and `@capacitor/splash-screen`):

```json
    "@capacitor/local-notifications": "^7.0.6",
```

- [ ] **Step 2: Run `npm install`**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && npm install`
Expected: install completes; the dependency is registered in `package-lock.json` and `node_modules/@capacitor/local-notifications` remains (was already present).

- [ ] **Step 3: Verify build still passes**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && npm run build`
Expected: `vite build` succeeds with no errors. The plugin is not yet imported, so this is purely a sanity check.

- [ ] **Step 4: Commit**

```bash
cd /Users/karsa/Downloads/upwork/DrAsif && git add package.json package-lock.json && git -c user.email=claude@anthropic.com -c user.name=Claude commit -m "chore: register @capacitor/local-notifications dependency"
```

---

## Task 2: Android manifest permissions

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml:37-41`

- [ ] **Step 1: Add the two `<uses-permission>` lines**

In `/Users/karsa/Downloads/upwork/DrAsif/android/app/src/main/AndroidManifest.xml`, replace the current `<!-- Permissions -->` block (lines 37–41):

```xml
    <!-- Permissions -->

    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

with:

```xml
    <!-- Permissions -->

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
</manifest>
```

- [ ] **Step 2: Verify the file**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && grep -n "uses-permission" android/app/src/main/AndroidManifest.xml`
Expected: three matches — `INTERNET`, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`.

- [ ] **Step 3: Commit**

```bash
cd /Users/karsa/Downloads/upwork/DrAsif && git add android/app/src/main/AndroidManifest.xml && git -c user.email=claude@anthropic.com -c user.name=Claude commit -m "chore(android): add POST_NOTIFICATIONS and SCHEDULE_EXACT_ALARM"
```

> Note: `cap sync` is run once at the end (Task 7) to push the manifest change to the native project; the Java/Kotlin plugin registration happens automatically via the Capacitor plugin scan.

---

## Task 3: Create the NotificationService module

**Files:**
- Create: `src/services/notifications.js`

- [ ] **Step 1: Create the file with full contents**

Write `/Users/karsa/Downloads/upwork/DrAsif/src/services/notifications.js` with exactly this content:

```js
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { StorageService } from "./storage";

// ─── Constants ────────────────────────────────────────────────────────────────

export const NOTIFICATION_IDS = {
  FOOD: 1001,
  EXERCISE: 1002,
  MILESTONE_BASE: 2000, // dynamic IDs are 2000 + (Date.now() % 1_000_000)
};

export const NOTIFICATION_CONTENT = {
  food: { title: "Log your meals", body: "Don't forget today's meal log." },
  exercise: { title: "Time to move", body: "Don't forget today's exercise." },
  challenge: { title: "🎉 Congratulations!", body: "You've reached a new milestone! Keep it up." },
};

export const NOTIFICATION_TAB = {
  food: "calories",
  exercise: "calories",
  challenge: "challenge",
};

export const DEFAULT_SETTINGS = {
  food: { enabled: false, hour: 9, minute: 0 },
  exercise: { enabled: false, hour: 18, minute: 0 },
  challenge: { enabled: false },
};

const STORAGE_KEY = "dr_notif_settings";
const ASKED_KEY = "dr_notif_permission_asked";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isNative = () => Capacitor.isNativePlatform();

function readSettings() {
  const stored = StorageService.load(STORAGE_KEY, null);
  if (!stored) {
    return {
      food: { ...DEFAULT_SETTINGS.food },
      exercise: { ...DEFAULT_SETTINGS.exercise },
      challenge: { enabled: DEFAULT_SETTINGS.challenge.enabled },
    };
  }
  return {
    food: { ...DEFAULT_SETTINGS.food, ...(stored.food || {}) },
    exercise: { ...DEFAULT_SETTINGS.exercise, ...(stored.exercise || {}) },
    challenge: { ...DEFAULT_SETTINGS.challenge, ...(stored.challenge || {}) },
  };
}

function writeSettings(s) {
  StorageService.save(STORAGE_KEY, s);
}

function markAsked() {
  try { localStorage.setItem(ASKED_KEY, "true"); } catch {}
}

async function scheduleDaily(id, content, type, hour, minute) {
  if (!isNative()) return;
  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title: content.title,
        body: content.body,
        schedule: { on: { hour, minute }, repeats: true },
        extra: { type },
      },
    ],
  });
}

async function cancelOne(id) {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch (e) {
    console.warn(`NotificationService.cancelOne(${id}) failed:`, e);
  }
}

// ─── Public Service ───────────────────────────────────────────────────────────

export const NotificationService = {
  // Lifecycle
  async init({ onTap }) {
    if (!isNative()) return;
    try {
      await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
        const type = event.notification?.extra?.type;
        const tabId = NOTIFICATION_TAB[type];
        if (tabId && typeof onTap === "function") onTap(tabId);
      });
    } catch (e) {
      console.warn("NotificationService.init failed:", e);
    }
  },

  // Permission
  async requestPermission() {
    if (!isNative()) return "denied";
    let result;
    try {
      result = await LocalNotifications.requestPermissions();
    } catch (e) {
      console.warn("NotificationService.requestPermission failed:", e);
      return "denied";
    }
    markAsked();
    if (result.display === "granted") {
      const current = readSettings();
      const isFirstGrant =
        !current.food.enabled && !current.exercise.enabled && !current.challenge.enabled;
      if (isFirstGrant) {
        const updated = {
          food: { ...DEFAULT_SETTINGS.food, enabled: true },
          exercise: { ...DEFAULT_SETTINGS.exercise, enabled: true },
          challenge: { enabled: true },
        };
        writeSettings(updated);
        try {
          await scheduleDaily(NOTIFICATION_IDS.FOOD, NOTIFICATION_CONTENT.food, "food", updated.food.hour, updated.food.minute);
          await scheduleDaily(NOTIFICATION_IDS.EXERCISE, NOTIFICATION_CONTENT.exercise, "exercise", updated.exercise.hour, updated.exercise.minute);
        } catch (e) {
          console.warn("NotificationService.requestPermission initial schedule failed:", e);
        }
      }
    }
    return result.display;
  },

  async checkPermission() {
    if (!isNative()) return "denied";
    try {
      const r = await LocalNotifications.checkPermissions();
      return r.display;
    } catch (e) {
      console.warn("NotificationService.checkPermission failed:", e);
      return "denied";
    }
  },

  // Settings
  getSettings() {
    return readSettings();
  },

  async updateSettings(newSettings) {
    writeSettings(newSettings);
    try {
      await cancelOne(NOTIFICATION_IDS.FOOD);
      await cancelOne(NOTIFICATION_IDS.EXERCISE);
      if (newSettings.food?.enabled) {
        await scheduleDaily(NOTIFICATION_IDS.FOOD, NOTIFICATION_CONTENT.food, "food", newSettings.food.hour, newSettings.food.minute);
      }
      if (newSettings.exercise?.enabled) {
        await scheduleDaily(NOTIFICATION_IDS.EXERCISE, NOTIFICATION_CONTENT.exercise, "exercise", newSettings.exercise.hour, newSettings.exercise.minute);
      }
    } catch (e) {
      console.warn("NotificationService.updateSettings schedule failed:", e);
    }
  },

  // Imperative trigger for challenge milestones (wired up later)
  async triggerMilestone({ body } = {}) {
    if (!isNative()) return;
    const settings = readSettings();
    if (!settings.challenge.enabled) return;
    const perm = await NotificationService.checkPermission();
    if (perm !== "granted") return;
    const id = NOTIFICATION_IDS.MILESTONE_BASE + (Date.now() % 1_000_000);
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: NOTIFICATION_CONTENT.challenge.title,
            body: body || NOTIFICATION_CONTENT.challenge.body,
            schedule: { at: new Date(Date.now() + 1000) },
            extra: { type: "challenge" },
          },
        ],
      });
    } catch (e) {
      console.warn("NotificationService.triggerMilestone failed:", e);
    }
  },

  // Wipe all schedules + restore defaults. ASKED_KEY is preserved (raw localStorage).
  async reset() {
    if (isNative()) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications?.length) {
          await LocalNotifications.cancel({
            notifications: pending.notifications.map((n) => ({ id: n.id })),
          });
        }
      } catch (e) {
        console.warn("NotificationService.reset cancel failed:", e);
      }
    }
    writeSettings({
      food: { ...DEFAULT_SETTINGS.food },
      exercise: { ...DEFAULT_SETTINGS.exercise },
      challenge: { enabled: false },
    });
  },
};
```

- [ ] **Step 2: Verify the build**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && npm run build`
Expected: `vite build` succeeds with no errors. The new file is importable but not yet used.

- [ ] **Step 3: Commit**

```bash
cd /Users/karsa/Downloads/upwork/DrAsif && git add src/services/notifications.js && git -c user.email=claude@anthropic.com -c user.name=Claude commit -m "feat(notifications): add NotificationService module"
```

---

## Task 4: Create the useNotifications hook

**Files:**
- Create: `src/hooks/useNotifications.js`

- [ ] **Step 1: Create the file with full contents**

Write `/Users/karsa/Downloads/upwork/DrAsif/src/hooks/useNotifications.js` with exactly this content:

```js
import { useState, useEffect, useRef, useCallback } from "react";
import { App as CapApp } from "@capacitor/app";
import { NotificationService } from "../services/notifications";

export function useNotifications({ onTap }) {
  const [settings, setSettings] = useState(() => NotificationService.getSettings());
  const [permission, setPermission] = useState("prompt");
  const initRanRef = useRef(false);

  // Mount: register tap listener + request permission (one-shot, ref-guarded)
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;
    (async () => {
      await NotificationService.init({ onTap });
      const before = await NotificationService.checkPermission();
      setPermission(before);
      if (before === "prompt") {
        const result = await NotificationService.requestPermission();
        setPermission(result);
        if (result === "granted") {
          setSettings(NotificationService.getSettings());
        }
      }
    })();
  }, [onTap]);

  // App focus: re-check permission + flush pending schedules if newly granted
  useEffect(() => {
    let handle;
    (async () => {
      try {
        handle = await CapApp.addListener("appStateChange", async (state) => {
          if (!state.isActive) return;
          const perm = await NotificationService.checkPermission();
          setPermission(perm);
          if (perm === "granted") {
            const s = NotificationService.getSettings();
            const needSchedule = s.food.enabled || s.exercise.enabled;
            if (needSchedule) {
              await NotificationService.updateSettings(s);
              setSettings(s);
            }
          }
        });
      } catch (e) {
        console.warn("useNotifications appStateChange registration failed:", e);
      }
    })();
    return () => { if (handle) handle.remove(); };
  }, []);

  // Setters
  const persist = useCallback(async (next) => {
    setSettings(next);
    await NotificationService.updateSettings(next);
  }, []);

  const setFood = useCallback(async (food) => {
    await persist({ ...settings, food: { ...settings.food, ...food } });
  }, [settings, persist]);

  const setExercise = useCallback(async (exercise) => {
    await persist({ ...settings, exercise: { ...settings.exercise, ...exercise } });
  }, [settings, persist]);

  const setChallenge = useCallback(async (challenge) => {
    await persist({ ...settings, challenge: { ...settings.challenge, ...challenge } });
  }, [settings, persist]);

  // Toggle from UI: returns { permission } so caller can show denied-state UI
  const toggleFromUi = useCallback(async (kind) => {
    const isEnabling = !settings[kind]?.enabled;
    const next = { ...settings, [kind]: { ...settings[kind], enabled: isEnabling } };
    let resultPerm = permission;
    if (isEnabling) {
      const before = await NotificationService.checkPermission();
      if (before !== "granted") {
        const result = await NotificationService.requestPermission();
        setPermission(result);
        resultPerm = result;
      } else {
        resultPerm = before;
      }
    }
    await persist(next);
    return { permission: resultPerm };
  }, [settings, permission, persist]);

  const triggerMilestone = useCallback((opts) => NotificationService.triggerMilestone(opts), []);

  const reset = useCallback(async () => {
    await NotificationService.reset();
    setSettings(NotificationService.getSettings());
  }, []);

  return {
    settings,
    permission,
    setFood,
    setExercise,
    setChallenge,
    toggleFromUi,
    triggerMilestone,
    reset,
  };
}
```

- [ ] **Step 2: Verify the build**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && npm run build`
Expected: `vite build` succeeds with no errors. The hook is not yet used.

- [ ] **Step 3: Commit**

```bash
cd /Users/karsa/Downloads/upwork/DrAsif && git add src/hooks/useNotifications.js && git -c user.email=claude@anthropic.com -c user.name=Claude commit -m "feat(notifications): add useNotifications hook"
```

---

## Task 5: Wire the hook into `App` and `resetAllData`

**Files:**
- Modify: `src/dr_asif_v23_63_app.jsx` (import line, `App` function, `resetAllData`)

- [ ] **Step 1: Add the import**

In `/Users/karsa/Downloads/upwork/DrAsif/src/dr_asif_v23_63_app.jsx`, after the existing import block (find the last import near the top, around line 1–5), insert:

```js
import { useNotifications } from "./hooks/useNotifications";
```

> Tip: open the file and find the first `import` statement. The imports are at the very top of the file. Add this line after the last existing import.

- [ ] **Step 2: Call the hook inside `App`**

Find the line `function App() {` (currently around L4745). Immediately after the existing state declarations (the `useState` / `useStoredState` block — currently the last one is `const [progressLog, setProgressLog] = useStoredState("dr_progresslog", []);`), insert:

```js
  // ── Local notifications ────────────────────────────────────────────────────
  const notif = useNotifications({
    onTap: (tabId) => setActive(tabId),
  });
```

The hook is invoked at the top of `App` so its return value is available to pass down to `SettingsScreen` (Task 6) and to call from `resetAllData` (next step).

- [ ] **Step 3: Add `notif.reset()` to `resetAllData`**

Find the `resetAllData` function (currently around L4805). After the `clearSession();` line inside the `try { ... } catch {}` block that clears `localStorage` and session, add:

```js
    // 5. Cancel all scheduled notifications and reset notification settings
    try { await notif.reset(); } catch {}
```

Keep the existing numbered comments in order — this becomes step 5, the existing `setGender(null)` + `setAuthPhase("unauthenticated")` lines become steps 6 and 7. Specifically the updated `resetAllData` body should look like:

```js
  const resetAllData = async () => {
    setShowSettings(false);
    // 1. Delete the user account on the server.
    try { await apiDelete("/api/me"); } catch {}
    // 2. Revoke all refresh tokens. Access token is still cryptographically
    //    valid here, so this 200s even though the user row is gone.
    try { await logout({ all: true }); } catch {}
    // 3. Clear every local dr_* + auth_* key
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith("dr_") || k.startsWith("auth_"))
        .forEach(k => localStorage.removeItem(k));
      clearSession();
    } catch {}
    // 4. Reset every live React state variable so nothing is re-persisted
    setFoodLog([]);
    setExLog([]);
    setDailyLogs({});
    setProgressLog([]);
    setChallengePhase("week3");
    setChallengeStartDate(null);
    setChallengeStarted(false);
    setStreakDays(Array(7).fill(false));
    setUserProfile(null);
    setActive("home");
    // 5. Cancel all scheduled notifications and reset notification settings
    try { await notif.reset(); } catch {}
    // 6. Reset gender LAST → returns user to onboarding, guaranteeing a clean slate
    setGender(null);
    setAuthPhase("unauthenticated");
  };
```

- [ ] **Step 4: Verify the build**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && npm run build`
Expected: `vite build` succeeds with no errors. The hook is wired but the Settings UI doesn't consume it yet (Task 6); the only consumer is `resetAllData`.

- [ ] **Step 5: Smoke-check the boot flow**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && npm run dev`
Expected: dev server starts; opening `http://localhost:5173` in a browser loads the splash. On web the hook is a no-op (Service guards `isNativePlatform()`), so no errors.
Stop the dev server with Ctrl-C when done.

- [ ] **Step 6: Commit**

```bash
cd /Users/karsa/Downloads/upwork/DrAsif && git add src/dr_asif_v23_63_app.jsx && git -c user.email=claude@anthropic.com -c user.name=Claude commit -m "feat(notifications): wire useNotifications hook into App and resetAllData"
```

---

## Task 6: Add the Settings UI section

**Files:**
- Modify: `src/dr_asif_v23_63_app.jsx` (`SettingsScreen` component — props, toast extension, new section)

This task has three sub-edits in `SettingsScreen`. Read the function in full first so the line numbers in the verification step match.

- [ ] **Step 1: Extend the `SettingsScreen` signature and toast state**

Find the `SettingsScreen` function signature (currently L4385):

```js
function SettingsScreen({ gender, setGender, userProfile, setUserProfile, onClose, onDeleteAll }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const plan = PLANS[gender];
  const [showCalc, setShowCalc] = useState(false);
  const [showConfirmStandard, setShowConfirmStandard] = useState(false);
  const [showConfirmSwitch, setShowConfirmSwitch] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 2800); };
```

Replace the signature line and the toast state lines (keep the `confirmDelete` / `deleting` / `plan` / `showCalc` / `showConfirmStandard` / `showConfirmSwitch` lines as-is) with:

```js
function SettingsScreen({ gender, setGender, userProfile, setUserProfile, onClose, onDeleteAll, notif }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const plan = PLANS[gender];
  const [showCalc, setShowCalc] = useState(false);
  const [showConfirmStandard, setShowConfirmStandard] = useState(false);
  const [showConfirmSwitch, setShowConfirmSwitch] = useState(false);
  // toast: { message: string, action?: { label, onClick } } | null
  const [toast, setToast] = useState(null);
  const showToast = msg => { setToast({ message: msg, action: null }); setTimeout(() => setToast(null), 2800); };
```

- [ ] **Step 2: Update the existing toast call sites to use the new shape**

Two existing call sites use the old string toast:

- L4400: `showToast(\`✓ Switched to standard ${plan.label}'s plan · ${plan.presetMeals.toLocaleString()} kcal\`);`
- L4548: `showToast(\`✓ Plan updated · ${profile.dietTarget.toLocaleString()} kcal · Tap Done to continue\`);`

These are already compatible with the new `setToast({ message, action: null })` shape as long as `showToast` accepts a string and wraps it. The new `showToast` above does exactly that — pass a string, it wraps in `{ message, action: null }`. No change needed at the call sites themselves.

- [ ] **Step 3: Update the existing toast-rendering JSX to handle the new shape**

Find the existing toast render block (currently L4412–L4414):

```jsx
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: T.navy, color: "#fff", padding: "10px 22px", borderRadius: 50, fontFamily: "'DM Sans',sans-serif", fontSize: 13, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(15,45,74,0.25)" }}>{toast}</div>
      )}
```

Replace with:

```jsx
      {toast && (
        <div onClick={toast.action ? toast.action.onClick : undefined} style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: T.navy, color: "#fff", padding: "10px 22px", borderRadius: 50, fontFamily: "'DM Sans',sans-serif", fontSize: 13, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(15,45,74,0.25)", cursor: toast.action ? "pointer" : "default", display: "flex", alignItems: "center", gap: 10 }}>
          <span>{toast.message}</span>
          {toast.action && (
            <span style={{ background: "#fff", color: T.navy, padding: "3px 10px", borderRadius: 50, fontWeight: 700, fontSize: 12 }}>{toast.action.label}</span>
          )}
        </div>
      )}
```

- [ ] **Step 4: Insert the new "Notifications" section**

Find the existing `<p>Your Plan</p>` eyebrow (currently L4421). The new section goes **above** it. The line right before that eyebrow is `<div style={{ paddingTop: 24, marginBottom: 20 }}><LogoFull /></div>`. Insert this entire block right after the `</div>` that closes the LogoFull wrapper, and before the `<p>Your Plan</p>` line:

```jsx
      {/* ── NOTIFICATIONS ──────────────────────────────────────────────────── */}
      <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Notifications</p>

      <Card style={{ marginBottom: 12 }}>
        {/* Food Reminder row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: 0 }}>🍽 Food Reminder</p>
            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "2px 0 0" }}>Daily reminder to log your meals</p>
          </div>
          <input
            type="time"
            value={`${String(notif.settings.food.hour).padStart(2, "0")}:${String(notif.settings.food.minute).padStart(2, "0")}`}
            onChange={e => {
              const [h, m] = e.target.value.split(":").map(Number);
              notif.setFood({ hour: h, minute: m });
            }}
            disabled={!notif.settings.food.enabled}
            style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 8px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.navy, background: notif.settings.food.enabled ? T.surface : T.surfaceAlt, marginRight: 10 }}
          />
          <Switch
            on={notif.settings.food.enabled}
            onClick={async () => {
              const r = await notif.toggleFromUi("food");
              if (r.permission === "denied") {
                setToast({
                  message: "Notifications not authorized",
                  action: { label: "Open Settings", onClick: () => import("@capacitor/app").then(({ App }) => App.openAppSettings()) },
                });
                setTimeout(() => setToast(null), 5000);
              }
            }}
          />
        </div>

        {/* Exercise Reminder row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: 0 }}>🔥 Exercise Reminder</p>
            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "2px 0 0" }}>Daily reminder to log your exercise</p>
          </div>
          <input
            type="time"
            value={`${String(notif.settings.exercise.hour).padStart(2, "0")}:${String(notif.settings.exercise.minute).padStart(2, "0")}`}
            onChange={e => {
              const [h, m] = e.target.value.split(":").map(Number);
              notif.setExercise({ hour: h, minute: m });
            }}
            disabled={!notif.settings.exercise.enabled}
            style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 8px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.navy, background: notif.settings.exercise.enabled ? T.surface : T.surfaceAlt, marginRight: 10 }}
          />
          <Switch
            on={notif.settings.exercise.enabled}
            onClick={async () => {
              const r = await notif.toggleFromUi("exercise");
              if (r.permission === "denied") {
                setToast({
                  message: "Notifications not authorized",
                  action: { label: "Open Settings", onClick: () => import("@capacitor/app").then(({ App }) => App.openAppSettings()) },
                });
                setTimeout(() => setToast(null), 5000);
              }
            }}
          />
        </div>

        {/* Challenge Milestones row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: 0 }}>🏆 Challenge Milestones</p>
            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "2px 0 0" }}>Celebrate streak, goal, and phase wins</p>
          </div>
          <Switch
            on={notif.settings.challenge.enabled}
            onClick={async () => {
              const r = await notif.toggleFromUi("challenge");
              if (r.permission === "denied") {
                setToast({
                  message: "Notifications not authorized",
                  action: { label: "Open Settings", onClick: () => import("@capacitor/app").then(({ App }) => App.openAppSettings()) },
                });
                setTimeout(() => setToast(null), 5000);
              }
            }}
          />
        </div>

        {/* Permission status footer */}
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "10px 4px 2px", marginTop: 4 }}>
          {notif.permission === "granted" && (
            <p style={{ color: T.sage, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>✓ Notifications are enabled</p>
          )}
          {notif.permission === "denied" && (
            <p
              onClick={() => import("@capacitor/app").then(({ App }) => App.openAppSettings())}
              style={{ color: T.terra, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0, cursor: "pointer", textDecoration: "underline" }}
            >
              ⚠ Notifications are disabled on this device. Tap to open System Settings.
            </p>
          )}
          {notif.permission === "prompt" && (
            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>Notification permission not yet requested — toggle one on above to enable.</p>
          )}
        </div>
      </Card>
```

- [ ] **Step 5: Add the `Switch` helper component above `SettingsScreen`**

Find the line `// ─── Settings / About Screen ──────────────────────────────────────────────────` (currently L4384). Insert a small `Switch` component above it (the comment is fine; just put the component above the comment):

```jsx
// ─── Pill switch (used in Notifications settings) ─────────────────────────────
function Switch({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        flexShrink: 0, width: 46, height: 26, borderRadius: 99, border: "none",
        background: on ? T.teal : T.border,
        position: "relative", cursor: "pointer", padding: 0,
        transition: "background 0.18s",
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: on ? 23 : 3,
        width: 20, height: 20, borderRadius: "50%", background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.18)", transition: "left 0.18s",
      }} />
    </button>
  );
}
```

- [ ] **Step 6: Pass `notif` from `App` into `SettingsScreen`**

Find the `<SettingsScreen ... />` JSX (currently L4945). The current props block:

```jsx
            <SettingsScreen
              gender={gender}
              setGender={setGender}
              userProfile={userProfile}
              setUserProfile={setUserProfile}
              onClose={() => setShowSettings(false)}
              onDeleteAll={resetAllData}
            />
```

Add `notif={notif}` as a new prop:

```jsx
            <SettingsScreen
              gender={gender}
              setGender={setGender}
              userProfile={userProfile}
              setUserProfile={setUserProfile}
              onClose={() => setShowSettings(false)}
              onDeleteAll={resetAllData}
              notif={notif}
            />
```

- [ ] **Step 7: Verify the build**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && npm run build`
Expected: `vite build` succeeds with no errors. This is the full app assembled — if any prop name, import, or JSX typo exists, vite will surface it.

- [ ] **Step 8: Verify no broken references in the existing toast users**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && grep -n "showToast\|setToast" src/dr_asif_v23_63_app.jsx | head -20`
Expected: matches inside `SettingsScreen` and `CaloriesTab` and `ChallengeTab` (the latter two have their own local toast state, unrelated to ours). The `SettingsScreen` matches should show:
- `const [toast, setToast] = useState(null);`
- `setToast({ message: msg, action: null })` inside `showToast`
- 3× `setToast({ message: ..., action: ... })` inside the new switch onClick handlers

- [ ] **Step 9: Commit**

```bash
cd /Users/karsa/Downloads/upwork/DrAsif && git add src/dr_asif_v23_63_app.jsx && git -c user.email=claude@anthropic.com -c user.name=Claude commit -m "feat(notifications): add Notifications section to SettingsScreen"
```

---

## Task 7: Capacitor sync (push changes to native projects)

**Files:** none (runs `cap sync` to update `ios/` and `android/`)

- [ ] **Step 1: Run `cap sync`**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && npx cap sync`
Expected: `cap sync` reports it synced `ios` and `android` and installed the local-notifications plugin into both native projects (e.g. `Found N Capacitor plugins for android`, `Found N Capacitor plugins for ios`). No errors.

- [ ] **Step 2: Verify iOS Podfile picked up the plugin**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && grep -n "CapacitorLocalNotifications\|local-notifications" ios/App/Podfile.lock 2>/dev/null | head -5`
Expected: at least one match confirming the local-notifications pod was registered.

- [ ] **Step 3: Verify Android Gradle picked up the plugin**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && find android -name "build.gradle" -path "*/local-notifications/*" 2>/dev/null | head -3`
Expected: at least one match — the local-notifications Android module is present.

- [ ] **Step 4: Commit the lockfile + native project regen**

```bash
cd /Users/karsa/Downloads/upwork/DrAsif && git add ios/App/Podfile.lock android/ && git -c user.email=claude@anthropic.com -c user.name=Claude commit -m "chore: cap sync to register local-notifications in native projects"
```

> Note: if there are no diffs in `android/` (cap sync only updates generated files that aren't tracked), the `git add` will be a no-op. Skip the commit and move on.

---

## Task 8: Manual verification on iOS simulator

**Files:** none (manual verification — run, observe, screenshot)

- [ ] **Step 1: Build and run on iOS**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && make ios-dev` (or `npm run cap:build:ios && npx cap open ios` and run from Xcode)
Expected: app builds and launches on the default iOS simulator. Auth flow appears (Sign in with Apple button, since this is iOS).

- [ ] **Step 2: Sign in and complete onboarding**

Tap Sign in with Apple, accept the prompt, then complete gender selection / personalised plan.
Expected: lands on the Home tab.

- [ ] **Step 3: Verify system permission prompt appears**

Watch for the iOS system notification permission prompt within ~2 seconds of landing on Home.
Expected: standard iOS prompt "Dr Asif Diet Would Like to Send You Notifications" with Allow / Don't Allow.

- [ ] **Step 4: Tap Allow**

Tap Allow.
Expected: prompt dismisses; no in-app error.

- [ ] **Step 5: Open Settings and verify the Notifications section**

Tap the ⚙ button (top-right) to open the Settings overlay. Scroll to the "Notifications" section (it should be just above "Your Plan").
Expected: three rows visible:
- 🍽 Food Reminder · toggle ON · time 09:00
- 🔥 Exercise Reminder · toggle ON · time 18:00
- 🏆 Challenge Milestones · toggle ON
- A footer line: "✓ Notifications are enabled"

- [ ] **Step 6: Screenshot for record**

Run: `xcrun simctl io "iPhone 16 Pro" screenshot /tmp/ios-notif-settings.png && open /tmp/ios-notif-settings.png`
Expected: screenshot shows the Settings overlay with the three notification rows.

- [ ] **Step 7: Toggle a reminder off, then on**

Tap the Food Reminder switch.
Expected: switch turns off (gray); time input becomes visually disabled.

Tap it again.
Expected: switch turns back on (teal); time input becomes enabled. If permission was somehow not granted, the denied-toast with "Open Settings" should appear.

- [ ] **Step 8: Change a time**

Tap the time input next to Exercise Reminder, set it to 5 minutes from now (e.g., current time + 5 min). Confirm.
Expected: time updates; no error. Send the app to background (home button / swipe up). Wait 6 minutes. A notification banner should appear with "Time to move · Don't forget today's exercise." Tapping it should open the app back to the Calories tab.

- [ ] **Step 9: Verify denied path**

Quit the simulator (or uninstall the app from the simulator first to reset permissions). Reinstall and re-launch. When the iOS prompt appears, tap "Don't Allow". Open Settings.
Expected: footer reads "⚠ Notifications are disabled on this device. Tap to open System Settings." Tap it — the iOS Settings app should open to Dr Asif Diet's notification page. (You may need to manually enable in iOS Settings, return to the app, and verify the footer updates.)

---

## Task 9: Manual verification on Android emulator

**Files:** none (manual verification — run, observe, screenshot)

- [ ] **Step 1: Build and run on Android**

Run: `cd /Users/karsa/Downloads/upwork/DrAsif && make android-dev` (or `npm run cap:build:android && npx cap open android` and run from Android Studio)
Expected: app builds and launches on the default Android emulator. Auth flow appears (Sign in button — or auto-dismiss since this is non-iOS per `SplashScreen.onAppleSignedIn` logic).

- [ ] **Step 2: Sign in / skip auth and complete onboarding**

If the splash auto-dismisses (non-iOS) you land on gender selection. Complete it.
Expected: lands on the Home tab.

- [ ] **Step 3: Verify system permission prompt appears**

On Android 13+, watch for the runtime POST_NOTIFICATIONS prompt.
Expected: Android 13+ standard "Allow Dr Asif Diet to send you notifications?" prompt with Allow / Don't allow.
On Android 12 and below, no prompt — the system grants automatically.

- [ ] **Step 4: Tap Allow (or auto-grant)**

Expected: prompt dismisses; no in-app error.

- [ ] **Step 5: Open Settings and verify the Notifications section**

Tap the ⚙ button to open the Settings overlay.
Expected: identical to iOS — three rows, default times 09:00 / 18:00, footer "✓ Notifications are enabled".

- [ ] **Step 6: Screenshot for record**

Run: `~/Library/Android/sdk/platform-tools/adb -s 127.0.0.1:6562 exec-out screencap -p > /tmp/android-notif-settings.png && open /tmp/android-notif-settings.png`
Expected: screenshot shows the Settings overlay with the three notification rows.
> Note: device ID may vary; check with `~/Library/Android/sdk/platform-tools/adb devices` and adjust the `-s` argument.

- [ ] **Step 7: Verify time-based delivery**

Change the Food Reminder time to ~2 minutes from now. Send the app to background. Wait.
Expected: A notification appears in the Android system tray with "Log your meals / Don't forget today's meal log." Tapping it should open the app to the Calories tab.

- [ ] **Step 8: Verify reset on "Delete All My Data"**

Open Settings, scroll to the bottom, tap "Delete All My Data", confirm.
Expected: app returns to onboarding. Re-complete onboarding, open Settings → Notifications.
Expected: All three toggles OFF at 09:00 / 18:00 (the defaults). No system prompt this time (the ASKED_KEY flag survived the reset, so we know we've already asked).

---

## Self-Review

**1. Spec coverage:**

| Spec section | Covered by |
|---|---|
| § Goals — three notification types | Task 3 (Service), Task 6 (UI) |
| § Goals — single new file + hook | Tasks 3, 4 |
| § Goals — minimal edits to app file | Task 5 (≤ 6 lines in App), Task 6 (one new section + one prop) |
| § Goals — no edits to existing tabs | No tasks touch HomeTab/CaloriesTab/ChallengeTab bodies |
| § Goals — native config (iOS no-op, Android 12+ / 13+) | Task 1 (no-op), Task 2 (manifest), Task 7 (sync) |
| § Data Model — `dr_notif_settings` via `StorageService` | Task 3 (Service `readSettings`/`writeSettings`) |
| § Data Model — `dr_notif_permission_asked` raw localStorage | Task 3 (`markAsked` uses raw `localStorage.setItem`) |
| § Service API — all methods | Task 3 (init, requestPermission, checkPermission, getSettings, updateSettings, triggerMilestone, reset) |
| § Hook API | Task 4 |
| § UI — new "Notifications" section | Task 6 |
| § UI — toast extension to support action | Task 6 Step 1 + 3 |
| § UI — denied-state recovery | Task 6 Step 4 (toast + "Open Settings") |
| § Permission flow | Task 3 `requestPermission`, Task 4 mount-time trigger |
| § appStateChange re-check | Task 4 useEffect |
| § Reset integration | Task 5 Step 3 |
| § Native config — `package.json` | Task 1 |
| § Native config — `Info.plist` no changes | Documented in File Structure (no task) |
| § Native config — Android manifest | Task 2 |
| § Native config — `capacitor.config.json` | Documented in File Structure (intentionally skipped, cosmetic) |
| § Edge cases — denied path | Task 8 Step 9, Task 9 |
| § Edge cases — re-enable in OS settings → return to app | Task 4 `appStateChange` handler |
| § Edge cases — web dev mode no-op | Task 3 `isNative()` guards |
| § Edge cases — reset preserves ASKED_KEY | Task 3 `reset()` does not touch `ASKED_KEY` |
| § Testing plan — 8 manual verification steps | Tasks 8 + 9 cover all of them |
| § Out of scope — milestone trigger wiring | Not implemented (deferred per user) — `triggerMilestone` exposed in hook return value for future |

**2. Placeholder scan:** No "TBD", "TODO", "fill in", "similar to" references. Every code block is complete. Every step has a concrete file path and action.

**3. Type / name consistency:**

- `NOTIFICATION_IDS.FOOD` / `EXERCISE` / `MILESTONE_BASE` — used in Task 3 only (consistent)
- `NOTIFICATION_TAB` mapping `food → "calories"`, `exercise → "calories"`, `challenge → "challenge"` — used in Task 3 `init` callback
- `DEFAULT_SETTINGS` — used in Task 3 only (the hook reads via `NotificationService.getSettings()`)
- Hook return shape: `{ settings, permission, setFood, setExercise, setChallenge, toggleFromUi, triggerMilestone, reset }` — Task 4 defines, Task 6 consumes via `notif.settings.food.hour`, `notif.toggleFromUi("food")`, etc. All match.
- App-level prop: `notif={notif}` (Task 5) → `<SettingsScreen ... notif={notif} />` (Task 6) → `notif` parameter destructured in SettingsScreen (Task 6 Step 1) — all consistent.
- Toast shape: `{ message, action } | null` — defined in Task 6 Step 1, used in Task 6 Step 3 (render), Step 4 (setToast calls), and Step 5 (Switch onClick handlers). All match.
- Switch component: takes `{ on, onClick }` — used in 3 places in Task 6 Step 4. All match.
- Storage key: `dr_notif_settings` — used in Task 3 Service. Hook reads via `NotificationService.getSettings()`. UI never touches the key directly. Consistent.
- Local key: `dr_notif_permission_asked` — used in Task 3 (`markAsked`). Never read elsewhere. Consistent.

No type / name drift detected.

---

## Files Modified Summary

| File | Net change |
|---|---|
| `package.json` | +1 dependency line |
| `android/app/src/main/AndroidManifest.xml` | +2 `<uses-permission>` lines |
| `src/services/notifications.js` | **new** (~190 lines) |
| `src/hooks/useNotifications.js` | **new** (~90 lines) |
| `src/dr_asif_v23_63_app.jsx` | +1 import, +3 lines in `App`, +1 line in `resetAllData`, +~125 lines in `SettingsScreen` (new "Notifications" block), +~20 lines for `Switch` component, 1 prop added to `<SettingsScreen>` |
| iOS Info.plist | unchanged |
| `capacitor.config.json` | unchanged (Android smallIcon skipped) |
| `ios/App/Podfile.lock` + `android/` (generated) | regen via `cap sync` |
