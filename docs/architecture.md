# Architecture Reference

> Auto-generated from code inspection. Update when component structure changes.

## Source files

| File | Purpose |
|---|---|
| `src/dr_asif_v21_app.jsx` (~1166 lines) | Main SPA — all components, inline styles, app shell |
| `src/services/storage.js` | `StorageService` + domain-specific hooks + `STORAGE_KEYS` |
| `src/main.jsx` | Vite entry point, safe-area init |

## Component Tree (line numbers from `dr_asif_v21_app.jsx`)

```
App (L1053, export default)
├── Splash (L157)                        — auto-dismiss brand intro, 2.2s timer
├── Onboarding (L172)                    — gender selection + optional CalcForm
│   └── CalcForm (L97)                   — personalised plan calculator (Mifflin-St Jeor)
├── [Main shell: gear button + bottom nav + content area + overlays]
│   ├── HomeTab (L216)                   — daily plan, quote, streak, meal overview
│   ├── CaloriesTab (L323)               — food/exercise log, photo scanner (Anthropic vision)
│   ├── FoodTab (L513)                   — food guide / nutrition reference
│   ├── ChallengeTab (L668)              — 12-week ABS-X challenge, daily check-in
│   ├── CoachTab (L740)                  — AI coach via Anthropic API
│   ├── [More drawer — L1104]
│   │   ├── TrackTab (L784)              — weight/waist/photo progress, inline SVG charts
│   │   ├── MindTab (L830)               — mindset, habit formation, quiz
│   │   ├── LearnTab (L876)              — chapter summaries
│   │   └── CommunityTab (L918)          — verified reviews, like tracking
│   └── [Settings overlay — L1124]
│       └── SettingsPanel (L957)         — plan details, calculator, gender/plan switching
├── Shared UI (L74–94)
│   ├── LogoMark, Card, Ttl, ToastMsg
├── Tab configs (L1049–1051)
│   ├── PT (primary tabs): home, calories, food, challenge, coach
│   └── MT (more tabs): track, mind, learn, community
```

## App State (all in `App` component, L1053)

| State | Hook | Default | Persisted |
|---|---|---|---|
| `splash` | `useState` | `true` | No (session-only) |
| `gender` | `useGender` | `null` | Yes — `user.gender` |
| `active` | `useState` | `"home"` | No (session-only) |
| `streak` | `useStreak` | `[false×7]` | Yes — `streak.weekly` |
| `settings` | `useState` | `false` | No (session-only) |
| `more` | `useState` | `false` | No (session-only) |
| `userProfile` | `useUserProfile` | `null` | Yes — `user.profile` |

Domain state (inside child components, via storage hooks):
- `useCaloriesFood` / `useCaloriesExercise` — CaloriesTab
- `useChallengePhase` / `useChallengeStarted` / `useChallengeChecked` — ChallengeTab
- `useTrackEntries` — TrackTab
- `useCoachMessages` — CoachTab
- `useCommunityLiked` — CommunityTab

## App Flow

```
App loads → splash? → SplashScreen (2.2s)
         → no gender? → Onboarding (gender select + optional CalcForm)
         → has gender → Main shell (tabs + overlays)
```

Settings and More are overlay panels (backdrop + bottom sheet), always rendered above the tab content.

## Data Layer (`src/services/storage.js`)

### StorageService API

| Method | Signature | Notes |
|---|---|---|
| `save(key, data)` | `(string, any) → void` | JSON-serializes, catches quota errors |
| `load(key, fallback)` | `(string, any?) → any` | JSON-parses, returns fallback on miss |
| `exportAll()` | `() → object` | All STORAGE_KEYS as nested object |
| `importAll(json)` | `(object) → void` | Bulk restore from export format |
| `clearAll()` | `() → void` | Removes all STORAGE_KEYS from localStorage |

### STORAGE_KEYS

```
user.gender, user.profile
streak.weekly
calories.food, calories.exercise
challenge.phase, challenge.started, challenge.checked
track.entries
coach.messages
community.liked
```

### useStorage hook

Generic `useState` + auto-persist wrapper. Domain hooks (`useGender`, `useUserProfile`, etc.) are thin wrappers: `useStorage(STORAGE_KEYS.xxx, defaultValue)`.

## Key Patterns

- **Bottom sheets**: Settings and More are overlays with backdrop blur + slide-up panels. Implementation in App render (L1104, L1124).
- **Confirmation flow**: `conf` state string (`null` → `"std"` / `"sw"`) toggles inline confirm UI. See SettingsPanel L993–1004.
- **Toast**: `ToastMsg` component + `showT` helper (set message, auto-clear via setTimeout).
- **Tab switching**: `setActive(tabId)` — no router, just a switch statement in `render()` (L1078).
- **Section comments**: `// ─── NAME ───` pattern throughout.
