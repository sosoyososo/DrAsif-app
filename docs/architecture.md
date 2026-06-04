# Architecture Reference

> Auto-generated from code inspection. Update when component structure changes.

## Source files

| File | Purpose |
|---|---|
| `src/dr_asif_v23_app.jsx` (~4824 lines) | Main SPA — all components, inline styles, app shell |
| `src/services/storage.js` | `StorageService` with dynamic registry — `lsGet`/`lsSet` delegate here |
| `src/main.jsx` | Vite entry point, safe-area init, imports `dr_asif_v23_app.jsx` |

## Component Tree (line numbers from `dr_asif_v23_app.jsx`)

```
App (L4737, export default)                    — authPhase state machine; boot probe
├── SplashScreen (L4647)                    — sign-in (iOS) / brand reveal (non-iOS)
├── OnboardingScreen (L825)                  — gender selection + PersonalisedPlanCalculator
│   └── PersonalisedPlanCalculator (L697)    — Mifflin-St Jeor profile builder
├── [Main shell: gear button + bottom nav + content area + overlays]
│   ├── HomeTab (L940)                       — daily plan, quote, streak, meal overview
│   │   └── ProteinCalculator (L1181)        — protein macro calculator
│   ├── CaloriesTab (L1932)                  — food/exercise log, photo scanner
│   │   └── EXERCISE_PRESETS (L1921)         — exercise preset kcal/min data
│   ├── FoodGuideTab (L2844)                  — food guide / nutrition reference
│   │   ├── FOOD_DATA (L2545)                — structured food database
│   │   └── UNREFINED_PRINCIPLES (L2835)     — food principles
│   ├── ChallengeTab (L1389)                  — 12-week ABS-X challenge, daily check-in
│   │   ├── PHASE_CONFIG (L1254)             — week3 / month3 / month3fit config
│   │   └── Phase2Recalc (L1328)             — Phase 2 profile recalc
│   ├── CoachTab (L3236)                      — AI coach via Anthropic API
│   ├── [More drawer — L4952]
│   │   ├── TrackTab (L3091)                  — weight/waist/photo progress
│   │   ├── MindTab (L3812)                   — mindset, psychology tools, quizzes
│   │   │   ├── MIND_TYPES (L368)            — mindset category data
│   │   │   ├── PSYCHOLOGY_TOOLS (L378)      — cognitive tools
│   │   │   ├── CYCLES (L398)                — positive/negative cycle data
│   │   │   ├── PRACTICES (L416)             — daily practices
│   │   │   └── AFFIRMATIONS (L440)          — affirmations
│   │   ├── LearnTab (L3458)                  — chapter summaries
│   │   └── CommunityTab (L3534)             — verified reviews
│   └── [Settings overlay — L4877]
│       └── SettingsScreen (L4385)            — plan details, calculator, gender switching, Delete All
├── Shared UI (L604–664)
│   ├── Card, SectionTitle, Pill, Modal, InfoRow
├── Data objects (L106–604)
│   ├── T (design tokens, L6)
│   ├── PRIMARY_TABS / MORE_TABS / tabs (L106–119)
│   ├── PLANS (L129)                          — male/female book-based meal plans
│   ├── QUOTES (L241), PRINCIPLES (L266), CHAPTERS (L330), TIPS (L347)
│   ├── SEED_POSTS (L538)                     — community seed posts
├── Persistence (via `useStoredState` → `StorageService` in `src/services/storage.js`)
```

## App State (all in `App` component, L4737)

| State | Default | Persisted | Notes |
|---|---|---|---|
| `splash` | `true` | No | Session-only |
| `gender` | `lsGet("dr_gender", null)` | `dr_gender` | |
| `active` | `"home"` | No | Session-only |
| `streakDays` | `lsGet("dr_streak", Array(7).fill(false))` | `dr_streak` | |
| `showSettings` | `false` | No | Overlay toggle |
| `showMore` | `false` | No | More drawer toggle |
| `userProfile` | `lsGet("dr_profile", null)` | `dr_profile` | `{ age, weight, height, activity, maintenance, dietTarget, bmi, protein }` |
| `foodLog` | `lsGet("dr_foodlog_" + today, [])` | `dr_foodlog_YYYY-MM-DD` | Date-keyed |
| `exLog` | `lsGet("dr_exlog_" + today, [])` | `dr_exlog_YYYY-MM-DD` | Date-keyed |
| `challengePhase` | `lsGet("dr_phase", "week3")` | `dr_phase` | |
| `challengeStartDate` | `lsGet("dr_startdate", null)` | `dr_startdate` | |
| `challengeStarted` | `lsGet("dr_started", false)` | `dr_started` | |
| `dailyLogs` | `lsGet("dr_dailylogs", {})` | `dr_dailylogs` | `{ [date]: { meals, exercise, nosnack, ... } }` |
| `progressLog` | `lsGet("dr_progresslog", [])` | `dr_progresslog` | |

**Derived (not state):** `plan` — merges `PLANS[gender]` with `userProfile` overrides (L4569).

## App Flow

```
App loads → authPhase: "booting"
         → boot probe (GET /api/me; auto-refresh on 401)
            ├─ success → authPhase: "authenticated"
            └─ failure (no session, or refresh failed) → authPhase: "unauthenticated"
         → "unauthenticated" → SplashScreen (iOS: Sign in with Apple button)
         → "authenticated" + no gender → OnboardingScreen (gender + optional calculator)
         → "authenticated" + gender → Main shell (tabs + overlays)
```

Settings and More are slide-up overlay panels (backdrop + bottom sheet), always rendered above tab content. Tab bar remains visible when settings open.

## Auth

`src/services/api.js` is the single source of truth for session state and the only file that talks to the server auth endpoints.

### Session keys (localStorage)

| Key | Type | Purpose |
|---|---|---|
| `auth_token` | string (JWT HS256, 1h) | Bearer access token, sent on every protected request |
| `auth_refresh_token` | string (opaque, 30d) | Rotated by `POST /api/refresh`; single-use with reuse detection |
| `auth_user_id` | string (numeric) | Used in `/api/data/:user_id` path |

### Auth state machine

`App` holds `authPhase ∈ {"booting", "authenticated", "unauthenticated"}`:

- `booting` — initial state, splash shown, boot probe in flight
- `authenticated` — server confirmed the session via `/api/me` (possibly after auto-refresh)
- `unauthenticated` — no session, or session is unrecoverable; splash with sign-in (iOS) or auto-dismiss (non-iOS)

`authenticated` is purely about session validity. Whether onboarding (`dr_gender`) is complete is a render-level concern: `if (!gender) return <OnboardingScreen />` after the auth gate.

### Boot probe

```
getSession() → null          → "unauthenticated"
getSession() → { token, … }  → apiGet("/api/me")
                                  ├─ 200 → "authenticated"
                                  └─ 401 (apiFetch auto-refreshes first; if that also 401s)
                                     → clearSession() → "unauthenticated"
```

### 401-aware `apiFetch` (single-flight refresh)

Every protected request goes through `apiFetch`. On 401:

1. If no `auth_refresh_token` → `clearSession()` + `throw AuthError`
2. If a refresh is already in flight, await the same promise
3. Otherwise: `POST /api/refresh` with `{refresh_token}`
   - 200 → `setSession({token, refresh_token, user_id})` + retry original request
   - 401 (any of `token_reuse_detected` / `token_expired` / `invalid_token`) → `clearSession()` + `throw AuthError`
4. If retry also 401s → `clearSession()` + `throw AuthError`

### "Delete All My Data" → server flow

`resetAllData()` in App runs in this exact order:

1. `DELETE /api/me` — deletes the user row + all `user_data` + revokes refresh tokens
2. `POST /api/logout {all: true}` — defensive; covers any leftover refresh tokens
3. Wipe every `dr_*` + `auth_*` localStorage key + `clearSession()`
4. Reset all live React state; `setGender(null)` last

Order matters: `DELETE /api/me` is auth-protected, so it must run while the access token is still in session. `logout()` clears the session, so it has to run after the delete. The server's `logoutHandler` reads `user_id` from the JWT (no DB lookup), so logging out a freshly-deleted user still 200s.

## Data Layer

### Storage (StorageService — dynamic registry)

`StorageService` in `src/services/storage.js` manages persistence with a dynamic registry:

| Method | Signature | Notes |
|---|---|---|
| `save(key, data)` | `(string, any) → void` | JSON-serializes, auto-registers key in `__dr_storage_registry__` |
| `load(key, fallback)` | `(string, any?) → any` | JSON-parses, returns fallback on miss |
| `exportAll()` | `() → object` | Exports all registered keys as `{ [key]: value }` |
| `importAll(json)` | `(object) → void` | Bulk restore; auto-registers all imported keys |
| `clearAll()` | `() → void` | Clears registry and all stored keys |

**Storage keys:** dynamically tracked in `__dr_storage_registry__` localStorage key

### PLANS shape

```js
PLANS.male / PLANS.female = {
  label, icon, color,
  recommended, weightLossTarget, presetMeals, snackBuffer, thresholdBuffer, deficit,
  macros, meals: [{ name, tag, time, kcal, icon, carbs, examples, why }],
  bmi: { range, note },
  waist: { target, asian, drNote },
  bodyFat: { ripped, note },
  weightLossExercise, stayFitExercise, heartRate, proteinTarget, waistWarning,
  // added when userProfile exists:
  maintenance, personalised: true, bmiValue, proteinLow, proteinHigh
}
```

## Challenge Phases (PHASE_CONFIG)

| Phase | ID | Days | Description |
|---|---|---|---|
| 3-Week Habit | `week3` | 21 | ABS-X habit formation |
| 3-Month Weight Loss | `month3` | 90 | Reach X-Point |
| 3-Month Fitness | `month3fit` | 90 | Body composition / muscle |

## Key Patterns

- **Bottom sheets**: Settings and More are overlays with backdrop blur + slide-up panels (Settings opened at L4947, More drawer at L4958).
- **Personalised plan merge**: `plan` derived at render time from `basePlan` + `userProfile` (around L4825).
- **Settings as overlay**: Tab bar stays visible — no full page replace (comment at L4867).
- **Date-keyed logs**: `foodLog`/`exLog` keyed by `YYYY-MM-DD` — isolated per day.
- **Google Fonts**: Loaded via `<link>` tags inside JSX (L4598, L4636) — anti-pattern; should move to `index.html`.
- **Section comments**: `// ─── NAME ───` pattern throughout.