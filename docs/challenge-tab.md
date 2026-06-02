# ChallengeTab Architecture

## Overview

`ChallengeTab` is a phase-based challenge tracker in `src/dr_asif_v23_app.jsx` (lines 1389–1919). It guides users through three progressive challenge phases derived from Dr. Asif's book.

## Phase Definitions (PHASE_CONFIG, lines 1254–1326)

```
PHASE_CONFIG = {
  week3:    { id: "week3",    label: "3-Week Habit",       emoji: "🌱", days: 21, color: T.teal,    colorLight: T.tealXL,    dailyTargets: [...], tips: [...], warning: "..." },
  month3:   { id: "month3",   label: "3-Month Weight Loss", emoji: "⚖️", days: 90, color: "#1A4A6E", colorLight: "#EBF2F8", dailyTargets: [...], tips: [...], warning: "..." },
  month3fit:{ id: "month3fit",label: "3-Month Fitness",    emoji: "💪", days: 90, color: "#6B3FA0", colorLight: "#F0EBF8", dailyTargets: [...], tips: [...], warning: "..." },
}
```

Each phase has:
- `label`, `emoji`, `color` / `colorLight` — UI display
- `days` — required consecutive streak length to complete
- `dailyTargets[]` — daily checklist items with `id`, `label`, `icon`
- `tips[]` — advice shown in pre-start card, with `icon` and `text`
- `warning` — displayed below targets

## State (in App component, lines 4547–4551)

All challenge state is passed as props to `ChallengeTab`:

| State | Storage Key | Default | In ChallengeTab as |
|---|---|---|---|
| `challengePhase` | `dr_phase` | `"week3"` | `phase` prop |
| `challengeStartDate` | `dr_startdate` | `null` | `startDate` prop |
| `challengeStarted` | `dr_started` | `false` | `started` prop |
| `dailyLogs` | `dr_dailylogs` | `{}` | `{ [date]: { meals, exercise, nosnack, ... } }` |
| `progressLog` | `dr_progresslog` | `[]` | `progressLog` prop |

### `dailyLogs` Data Shape

```js
{
  [date]: {           // ISO date string "2026-05-31"
    meals: bool,      // ate only preset meals (within limit)
    exercise: bool,   // burned 500 kcal
    nosnack: bool,    // stayed within limit = no snacking
    // ... other targets
  }
}
```

Auto-synced from `CaloriesTab` via `syncChallenge()` (CaloriesTab L1963).

## Phase Unlock Logic

Phases are unlocked sequentially:
- **week3**: always unlocked (default starting phase)
- **month3**: unlocked after week3 is completed
- **month3fit**: unlocked after month3 is completed

Phase completion is tracked via `progressLog` array entries.

## User Flow

### Pre-Start View (`!started`)
1. Shows phase card with `dailyTargets` list
2. Shows first tip in a teal box
3. "Start {PhaseLabel} Today" button sets `setStarted(true)`

### Active View (`started`)
1. Shows today's checklist with checkboxes
2. Progress bar: checked targets / total targets
3. "Back to programme info" resets `started` to false
4. Book tips card shown below

### Phase 2+ Recalculation (`Phase2Recalc`, L1328)

When user has a `userProfile` and enters month3/month3fit, `Phase2Recalc` prompts for current weight to recalculate targets.

## Key Differences from v21

- v23 uses `dailyLogs` object (auto-synced from CaloriesTab) instead of v21's `checked` per-phase per-date structure
- v23 uses `progressLog` array instead of v21's `completed` object
- v23 auto-syncs challenge checklist from calorie data (`syncChallenge` in CaloriesTab L1963)
- v23 `PHASE_CONFIG` has richer `dailyTargets` and `tips` arrays
- v21 used `StorageService` hooks; v23 uses inline `lsGet`/`lsSet` with App-level `useEffect` persistence

## Related

- `PRIMARY_TABS` / `MORE_TABS` arrays (L106–119) control tab bar visibility
- `renderTab()` at line 4609 routes `"challenge"` to `<ChallengeTab ...>`
- `App` component owns all state and passes as props (14 props to ChallengeTab)