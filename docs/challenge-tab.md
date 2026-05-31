# ChallengeTab Architecture

## Overview

`ChallengeTab` is a phase-based challenge tracker in `src/dr_asif_v21_app.jsx` (lines 690–831). It guides users through three progressive challenge phases derived from Dr. Asif's book.

## Phase Definitions (lines 48–67)

```
PHASE_ORDER = ["week3", "month3", "month3fit"]

PHASES = {
  week3:     { label: "3-Week Habit",      emoji: "🌱", color: T.teal,    days: 21, targets: [...], tips: [...], warning: "..." },
  month3:    { label: "3-Month Weight Loss", emoji: "⚖️", color: "#1A4A6E", days: 90, targets: [...], tips: [...], warning: "..." },
  month3fit: { label: "3-Month Fitness",   emoji: "💪", color: "#6B3FA0", days: 90, targets: [...], tips: [...], warning: "..." },
}
```

Each phase has:
- `label`, `emoji`, `color` — UI display
- `days` — required consecutive streak length to complete
- `targets[]` — daily checklist items with `id`, `l` (label), `i` (icon)
- `tips[]` — advice shown in pre-start card, with `i` (icon) and `t` (text)
- `warning` — displayed below targets

## State (lines 691–694)

All challenge state is persisted to `localStorage` via domain-specific hooks:

| State | Hook | Storage Key | Default |
|-------|------|-------------|---------|
| `phase` | `useChallengePhase` | `challenge.phase` | `"week3"` |
| `started` | `useChallengeStarted` | `challenge.started` | `false` |
| `checked` | `useChallengeChecked` | `challenge.checked` | `{}` |
| `completed` | `useChallengeCompleted` | `challenge.completed` | `{ week3: null, month3: null, month3fit: null }` |

### `checked` Data Shape

```js
{
  [phase]: {           // e.g. "week3"
    [date]: {          // ISO date string "2026-05-31"
      [targetId]: bool // e.g. { fast: true, walk: false, ... }
    }
  }
}
```

## Phase Unlock Logic (lines 698–703)

```js
const isPhaseUnlocked = (phaseKey) => {
  const idx = PHASE_ORDER.indexOf(phaseKey);
  if (idx === 0) return true;                    // week3 always unlocked
  const prev = PHASE_ORDER[idx - 1];
  return completed[prev] !== null;               // requires prev phase completed
};
```

- **week3**: always unlocked
- **month3**: requires `completed.week3 !== null`
- **month3fit**: requires `completed.month3 !== null`

## User Flow

### Pre-Start View (`!started`)
1. Shows phase card with targets list
2. Shows first tip in a teal box
3. "Start {PhaseLabel} Today →" button sets `setStarted(true)`

### Active View (`started`)
1. Shows today's checklist with checkboxes
2. Progress bar: `done / cfg.targets.length`
3. "← Back to programme info" resets `started` to false
4. Book tips card shown below

### Checking Items
- `handleToggle(id)` calls `toggle(id)` then `setTimeout(handleAllDone, 0)`
- `toggle` mutates `checked[phase][today][id]` to its negation

### Phase Completion (`handleAllDone`, lines 718–744)

Triggered after every checkbox toggle:

1. If not all targets done for today → exit early
2. Count `streak` by iterating `phase.days` days backward from today
3. If every day in that streak has all targets checked → `streak++`
4. If `streak >= phaseDays` and phase not already completed:
   - `setCompleted({ ...c, [phase]: today })`
   - Find next phase index → `setPhase(PHASE_ORDER[nextIdx])`
   - `setStarted(false)` — returns to pre-start view

**Bug risk**: The auto-advance happens silently after `setTimeout(..., 0)`. No confirmation dialog. If streak is met, user is pushed to next phase immediately.

## Storage Hooks (src/services/storage.js)

See `storage.js` lines 113–117 for challenge hook definitions. All use `useStorage` which:
- Loads from `localStorage` on init
- Saves immediately on every `setAndPersist` call
- Uses `useRef` to always have current value for the `useCallback` closure

## Related

- `PRIMARY_TABS` / `MORE_TABS` arrays control tab bar visibility
- `renderTab()` at line ~1200 routes `"challenge"` to `<ChallengeTab plan={plan} gender={gender} />`
- `App` component owns `gender` and `plan` props passed down