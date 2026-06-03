# v23 → v23_63 merge report

**Date**: 2026-06-03
**Task**: Evaluate every commit on `src/dr_asif_v23_app.jsx` against the user-supplied
new file at `/Users/karsa/Downloads/upwork/DrAsif-doc/dr_asif_v23_FINAL (9).jsx`,
port the missing/needed changes, and document everything.

## TL;DR

- **11 commits** touched the local v23 file between its initial creation and `HEAD`
- **9 commits were ported** to the new file (now at `src/dr_asif_v23_63_app.jsx`)
- **1 commit was skipped** (`fa58103` — formatting only, no semantic change)
- **0 commits were deliberately dropped** (every functional commit was applied)
- Final file: **4977 lines**, structurally intact, all 9 functional commits verified
  in place

## Files involved

| Path | Role | Size |
|---|---|---|
| `src/dr_asif_v23_app.jsx` | Local HEAD (f197bc6) — the "old" v23 with all 11 commits | 4824 lines |
| `/Users/karsa/Downloads/upwork/DrAsif-doc/dr_asif_v23_FINAL (9).jsx` | User's new baseline | 4979 lines |
| `src/dr_asif_v23_63_app.jsx` | Result of this task — new baseline + 9 ported commits | 4977 lines |
| `tasks/v23-merge/` | All per-commit diffs, master diffs, evaluation, this report | 14 files |

The two source files were initially diverged at the same ancestor (v23 first
creation = commit `395cdaa`). The new file is **+155 lines vs local** because it
is a parallel branch that includes additional UI work the user has been iterating
on (e.g. an `onDeleteAll` prop on `SettingsScreen`, extra Mind/Community
content), but it does **not** include any of the 11 commits from the local repo.

## Per-commit verdict

| # | Hash | Subject | Verdict | Notes |
|---|------|---------|---------|-------|
| 1 | `f197bc6` | feat: route LLM calls through /api/llm/proxy via apiPost | **PORTED** | Replaced 2 direct `fetch("https://api.anthropic.com/…")` calls with `apiPost("/api/llm/proxy", …)`. Added `import { apiPost } from "./services/api.js"`. |
| 2 | `b097be5` | fix: progress rings start at 12 o'clock instead of drifting with pct | **PORTED** | Replaced `strokeDashoffset={…*0.25}` with `transform="rotate(-90 cx cy)"` on all 3 rings (phase ring in ChallengeTab, calorie ring, burn ring in CaloriesTab). |
| 3 | `709eda5` | fix: clip calorie/burn rings — R exceeded viewBox for stroke | **PORTED** | `const R = 54, circ = …` → `const R = 48, circ = …` in CaloriesTab, plus the explanatory comment. |
| 4 | `0148f49` | fix: portal Modal to body so it covers bottom nav on iOS | **PORTED** (combined with #5) | `Modal` now uses `createPortal(…, document.body)`. Added `import { createPortal } from "react-dom"`. Added the explanatory comment above the return. |
| 5 | `98c0e89` | fix: raise Modal zIndex from 300 to 500 | **PORTED** (combined with #4) | `zIndex: 300` → `zIndex: 500` inside the Modal root div. (The settings backdrop zIndex: 300 was left as-is, matching the local file — it's not the Modal.) |
| 6 | `722f683` | fix: close overlays on tab switch and prevent More/Settings z-index conflict | **PORTED** | Added 2 `useEffect`s after the persistence effects: `if (showSettings) setShowSettings(false)` and `if (showMore) setShowMore(false)`, both keyed on `[active]`. Also updated the More tab onClick: `() => { if (showSettings) setShowSettings(false); setShowMore(m => !m); }`. |
| 7 | `8f3be23` | fix: settings panel safe-area and z-index handling | **PORTED** | 4 changes: settings panel `bottom: 74` → `bottom: 0`; `maxHeight` now subtracts `env(safe-area-inset-bottom, 0px)`; scrollable content gains `padding: "0 0 env(safe-area-inset-bottom, 14px)"`; top-right controls `top: 14` → `top: "calc(14px + env(safe-area-inset-top))"`; bottom tab bar `zIndex: 100` → `zIndex: 400`. (The new file already had `env(safe-area-inset-bottom, 14px)` on the bottom tab padding — left in place.) |
| 8 | `6e7281e` | feat: add safe-area-inset-top padding to all 9 tab content areas | **PORTED** | Added `env(safe-area-inset-top)` to all 9 tab wrappers/headers. 4 use `calc(28|36|20 + env(safe-area-inset-top))` because they had existing top padding (Home header, Challenge header, FoodGuide header, Coach wrapper, Mind header). 4 use `env(safe-area-inset-top)` as their only top padding (Calories, Track, Learn, Community). |
| 9 | `77dcad5` | fix: remove maxWidth 390 constraint for full-width layouts | **PORTED** | 7 occurrences of `maxWidth: 390` removed: 3 in app/onboarding/splash wrappers (replaced with `width: "100%"`), 1 in Modal panel (folded into #4 edit), and 3 in overlay containers (settings panel, more drawer, bottom nav — just dropped the property). |
| 10 | `fa58103` | format v23.jsx | **SKIPPED** | 592-line diff is all whitespace/formatting (e.g. spacing around `=` in destructuring, function-arg spacing). No semantic change. Re-applying it to a 4979-line file would just produce noisy churn. |
| 11 | `ed70eb3` | feat: delegate lsGet/lsSet to StorageService in v23 | **PORTED** | `lsGet` now calls `StorageService.load(key, fallback)`; `lsSet` calls `StorageService.save(key, val)`. Added `import { StorageService } from "./services/storage.js"`. Direct `localStorage.getItem`/`setItem` calls in the new file went from 2 → 0. |

## Order of porting

Top-of-file edits first, then bottom, so the line numbers of each subsequent edit
remain stable:

1. Imports + lsGet/lsSet (#11) — line 1
2. LLM proxy (#1) — 2 call sites
3. Modal portal + zIndex (#4 + #5) — Modal definition
4. Rings (#2 + #3) — R constant + 3 transform edits
5. Remove maxWidth: 390 (#9) — 7 sites
6. Settings safe-area (#7) — 5 sites
7. Tab safe-area (#8) — 9 sites
8. Close overlays on tab switch (#6) — App root, More button onClick

## Final verification

Automated check on the result file (all OK):

```
Imports in new file: 4        (useState+useRef+useEffect, createPortal, StorageService, apiPost)
apiPost refs: 3               (1 import + 2 call sites in CaloriesTab image scan and CoachTab chat)
createPortal refs: 2          (1 import + 1 call in Modal)
Anthropic direct: 0           (no more direct api.anthropic.com calls)
zIndex: 500: 1                (Modal only)
zIndex: 300: 1                (settings backdrop — same in local, not in scope of #5)
maxWidth: 390: 0              (all removed)
strokeDashoffset: 0           (all 3 rings converted to rotate(-90))
R = 54: 0                     (no stale calorie ring)
R = 48: 1                     (calorie/burn ring only; phase ring uses R = 44 unchanged)
transform="rotate(-90: 3      (phase, calorie, burn)
env(safe-area-inset-top): 10  (9 tab sites + 1 top controls from #7)
StorageService refs: 3        (1 import + 2 calls in lsGet/lsSet)
Direct localStorage: 0        (no raw localStorage reads/writes in v23_63)
"Close overlays on tab switch": 1  (single comment + 2 useEffects under it)
More button onClick fix: 1    (mutual exclusion with Settings)
```

## What's in the new file that's NOT in local (no action, FYI only)

- `SettingsScreen` accepts an `onDeleteAll` prop, with a corresponding "Delete all
  data" button and a `resetAllData` function in `App` that clears every `dr_` key
  and resets all live state. The local v23 doesn't have this. **Left in place** —
  it's a feature the new file's branch added, not a bug.
- ~155 lines of additional UI/content (mostly Mind/Community/Track/Settings
  polish — the new file is a parallel branch with more work-in-progress).
- 3-line trim at the top of the file (different opening structure). The local has
  the imports on lines 1-3 then a blank line at 4; the new file had the imports
  on line 1 and started its `T` design tokens at line 3. After porting the 3
  imports from #11 + #1, both files now have a consistent 4-line import block.

## Risks / open questions

- **No build/test pass was run.** This file is a JSX module that compiles via
  Vite; the local project has no test suite. I did manual grep verification
  for every expected pattern. A real smoke test (e.g. `npm run dev` and click
  through the tabs) is recommended before shipping.
- **The LLM proxy path requires the server to be running.** `apiPost` calls
  `https://drasif-app-server-production-e198.up.railway.app/api/llm/proxy` in
  production or `http://localhost:8080/api/llm/proxy` in dev. If the server
  isn't running, the food-scan and Coach features will fail with `Server error`.
- **`@capacitor-community/apple-sign-in` is not referenced in the new file.**
  The new file has `setGender`/`setUserProfile`/onboarding flow but no Apple
  Sign In button. This matches the **first** version of v23 (commit `395cdaa`),
  not the post-Apple-Sign-In state. If the user wants Apple Sign In in v23_63,
  that's a separate port from commits outside the v23 file's history
  (`8235543`, `45cca6f`, etc.) — out of scope for this task.
- **The new file's `onDeleteAll` flow has no confirmation dialog.** A user
  could tap it and lose everything. Local v23 has the same gap (no
  confirmation), so this isn't a regression — just a thing to add later.

## Diff of the ported file vs local

```
src/dr_asif_v23_app.jsx  →  src/dr_asif_v23_63_app.jsx
779 changed lines  ·  466 insertions(+)  ·  313 deletions(-)
```

The +/- split is dominated by the new file's +155 lines of additional UI
content, plus the rewrites done by the 9 ported commits.
