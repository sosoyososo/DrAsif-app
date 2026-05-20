# Data Storage Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add localStorage persistence to dr_asif_v21_app.jsx via a StorageService + domain-specific hooks, minimal code changes to existing components.

**Architecture:** Single file `src/services/storage.js` containing STORAGE_KEYS registry, StorageService (localStorage facade), useStorage adapter hook, and 11 domain-specific hooks. Components migrate by replacing `useState(default)` with `useXxx(default)` — one line per state.

**Tech Stack:** Vanilla JS, React hooks, localStorage. No external dependencies.

---

## File Structure

```
src/services/storage.js   ← NEW, all storage code in one file
src/dr_asif_v21_app.jsx   ← MODIFY, replace useState with useXxx hooks
```

---

## Tasks

### Task 1: Create `src/services/storage.js`

**Files:**
- Create: `src/services/storage.js`

- [ ] **Step 1: Create directory**

Run: `mkdir -p /Users/karsa/Downloads/upwork/DrAsif/src/services`

- [ ] **Step 2: Write complete file**

Write the following complete file to `src/services/storage.js`:

```js
import { useState, useCallback } from "react";

// ─── Key Registry ─────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  user: {
    gender:  'user.gender',
    profile: 'user.profile',
  },
  streak: {
    weekly: 'streak.weekly',
  },
  calories: {
    food:     'calories.food',
    exercise: 'calories.exercise',
  },
  challenge: {
    phase:   'challenge.phase',
    started: 'challenge.started',
    checked: 'challenge.checked',
  },
  track: {
    entries: 'track.entries',
  },
  coach: {
    messages: 'coach.messages',
  },
  community: {
    liked: 'community.liked',
  },
};

// ─── StorageService ───────────────────────────────────────────────────────────

const StorageService = {
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`StorageService.save failed for key "${key}":`, e);
    }
  },

  load(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : fallback;
    } catch (e) {
      console.warn(`StorageService.load failed for key "${key}":`, e);
      return fallback;
    }
  },

  exportAll() {
    const result = {};
    for (const section in STORAGE_KEYS) {
      result[section] = {};
      for (const key in STORAGE_KEYS[section]) {
        result[section][key] = this.load(STORAGE_KEYS[section][key]);
      }
    }
    return result;
  },

  importAll(json) {
    if (!json || typeof json !== 'object') return;
    for (const section in json) {
      for (const key in json[section]) {
        this.save(`${section}.${key}`, json[section][key]);
      }
    }
  },

  clearAll() {
    for (const section in STORAGE_KEYS) {
      for (const key in STORAGE_KEYS[section]) {
        localStorage.removeItem(STORAGE_KEYS[section][key]);
      }
    }
  },
};

// ─── useStorage ───────────────────────────────────────────────────────────────

function useStorage(key, defaultValue) {
  const [value, setValue] = useState(() => StorageService.load(key, defaultValue));

  const setAndPersist = useCallback((next) => {
    const resolved = next instanceof Function ? next(value) : next;
    setValue(resolved);
    StorageService.save(key, resolved);
  }, [key, value]);

  return [value, setAndPersist];
}

// ─── Domain-specific Hooks ───────────────────────────────────────────────────

// User
export const useGender        = (defaultValue) => useStorage(STORAGE_KEYS.user.gender, defaultValue);
export const useUserProfile   = (defaultValue) => useStorage(STORAGE_KEYS.user.profile, defaultValue);

// Streak
export const useStreak        = (defaultValue) => useStorage(STORAGE_KEYS.streak.weekly, defaultValue);

// Calories
export const useCaloriesFood  = (defaultValue) => useStorage(STORAGE_KEYS.calories.food, defaultValue);
export const useCaloriesExercise = (defaultValue) => useStorage(STORAGE_KEYS.calories.exercise, defaultValue);

// Challenge
export const useChallengePhase  = (defaultValue) => useStorage(STORAGE_KEYS.challenge.phase, defaultValue);
export const useChallengeStarted = (defaultValue) => useStorage(STORAGE_KEYS.challenge.started, defaultValue);
export const useChallengeChecked = (defaultValue) => useStorage(STORAGE_KEYS.challenge.checked, defaultValue);

// Track
export const useTrackEntries = (defaultValue) => useStorage(STORAGE_KEYS.track.entries, defaultValue);

// Coach
export const useCoachMessages = (defaultValue) => useStorage(STORAGE_KEYS.coach.messages, defaultValue);

// Community
export const useCommunityLiked = (defaultValue) => useStorage(STORAGE_KEYS.community.liked, defaultValue);

export { STORAGE_KEYS, StorageService };
```

- [ ] **Step 3: Commit**

```bash
git add src/services/storage.js
git commit -m "$(cat <<'EOF'
feat: add storage service with domain-specific hooks

Single file src/services/storage.js containing:
- STORAGE_KEYS registry for all persistence keys
- StorageService (save/load/exportAll/importAll/clearAll)
- useStorage adapter hook
- 11 domain-specific hooks (useGender, useStreak, etc.)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add import to `dr_asif_v21_app.jsx`

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:1` (after the React import line)

- [ ] **Step 1: Add import statement**

Find line 1: `import { useState, useEffect, useRef } from "react";`

Add after it:
```js
import { useGender, useUserProfile, useStreak, useCaloriesFood, useCaloriesExercise, useChallengePhase, useChallengeStarted, useChallengeChecked, useTrackEntries, useCoachMessages, useCommunityLiked } from "./services/storage";
```

- [ ] **Step 2: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "feat: import storage hooks into app

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
"
```

---

### Task 3: Replace App-level state

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:1053-1059`

- [ ] **Step 1: Replace gender, streak, userProfile**

Find lines 1053-1059:
```jsx
  const [splash,setSplash]=useState(true);
  const [gender,setGender]=useState(null);
  const [active,setActive]=useState("home");
  const [streak,setStreak]=useState(Array(7).fill(false));
  const [settings,setSettings]=useState(false);
  const [more,setMore]=useState(false);
  const [userProfile,setUserProfile]=useState(null);
```

Replace with:
```jsx
  const [splash,setSplash]=useState(true);
  const [gender,setGender]=useGender(null);
  const [active,setActive]=useState("home");
  const [streak,setStreak]=useStreak(Array(7).fill(false));
  const [settings,setSettings]=useState(false);
  const [more,setMore]=useState(false);
  const [userProfile,setUserProfile]=useUserProfile(null);
```

Note: `splash`, `active`, `settings`, `more` are UI-only — do NOT change them.

- [ ] **Step 2: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "feat: replace App-level state with storage hooks

gender, streak, userProfile now persist to localStorage

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
"
```

---

### Task 4: Replace CaloriesTab state

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:324`

- [ ] **Step 1: Replace food and ex**

Find line 324:
```jsx
  const [food,setFood]=useState([]); const [ex,setEx]=useState([]);
```

Replace with:
```jsx
  const [food,setFood]=useCaloriesFood([]); const [ex,setEx]=useCaloriesExercise([]);
```

Note: Other state on lines 325-332 (`nm`, `nk`, `sm`, `mins`, `sex`, `toast`, `scanning`, `scanImg`, `scanResult`, `scanError`) are UI-only — do NOT change them.

- [ ] **Step 2: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "feat: replace CaloriesTab food/ex state with storage hooks

food and exercise logs now persist to localStorage

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
"
```

---

### Task 5: Replace ChallengeTab state

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:668-670`

- [ ] **Step 1: Replace phase, started, checked**

Find lines 668-670:
```jsx
  const [phase,setPhase]=useState("week3");
  const [started,setStarted]=useState(false);
  const [checked,setChecked]=useState({});
```

Replace with:
```jsx
  const [phase,setPhase]=useChallengePhase("week3");
  const [started,setStarted]=useChallengeStarted(false);
  const [checked,setChecked]=useChallengeChecked({});
```

- [ ] **Step 2: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "feat: replace ChallengeTab state with storage hooks

phase, started, checked now persist to localStorage

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
"
```

---

### Task 6: Replace TrackTab state

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:784`

- [ ] **Step 1: Replace entries**

Find line 784:
```jsx
  const [entries,setEntries]=useState([]);
```

Replace with:
```jsx
  const [entries,setEntries]=useTrackEntries([]);
```

Note: `w`, `wt`, `bf` on line 785 are UI-only — do NOT change them.

- [ ] **Step 2: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "feat: replace TrackTab entries with storage hook

weight/waist/body-fat entries now persist to localStorage

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
"
```

---

### Task 7: Replace CoachTab state

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:740`

- [ ] **Step 1: Replace msgs**

Find line 740:
```jsx
  const [msgs,setMsgs]=useState([{role:"assistant",text:`Hello! 🌿 I'm your AI Coach...`}]);
```

Replace with:
```jsx
  const [msgs,setMsgs]=useCoachMessages([{role:"assistant",text:`Hello! 🌿 I'm your AI Coach...`}]);
```

**Important:** The default value references `plan` from closure — this works correctly because useState (and useStorage) evaluate the default argument only on the first render (initialization). The initial value is captured at component mount and does not change on re-renders.

Note: `inp` and `loading` on line 741 are UI-only — do NOT change them.

- [ ] **Step 2: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "feat: replace CoachTab msgs with storage hook

coach conversation history now persists to localStorage

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
"
```

---

### Task 8: Replace CommunityTab state

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:924-925`

- [ ] **Step 1: Find the actual liked/lks state**

Read around line 924 to get the exact code:
```jsx
  const [liked,setLiked]=useState(reviews.map(()=>false));
  const [lks,setLks]=useState(reviews.map(r=>r.lk));
```

Replace with:
```jsx
  const [liked,setLiked]=useCommunityLiked(reviews.map(()=>false));
  const [lks,setLks]=useState(reviews.map(r=>r.lk));
```

**Important:** Only replace `liked` with `useCommunityLiked`. The `lks` state tracks like counts from the static reviews array — it does not need persistence (it's derived from `reviews` and `liked`), so leave it as `useState`.

- [ ] **Step 2: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "feat: replace CommunityTab liked with storage hook

liked state now persists to localStorage

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
"
```

---

## Verification

After all tasks, verify the app still works:

1. Run `npm run dev` and open the app in browser
2. Set gender, add food log, start challenge, add weight entry
3. Refresh the page — data should persist
4. Check browser DevTools → Application → Local Storage — keys should be present:
   - `user.gender`, `user.profile`, `streak.weekly`, `calories.food`, `calories.exercise`, `challenge.phase`, `challenge.started`, `challenge.checked`, `track.entries`, `coach.messages`, `community.liked`