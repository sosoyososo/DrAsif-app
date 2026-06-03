# Commit-by-commit evaluation: local v23 → new v23_63 baseline

**Local file**: `src/dr_asif_v23_app.jsx` (4824 lines, HEAD = f197bc6)
**New file**: `dr_asif_v23_FINAL (9).jsx` → copied to `src/dr_asif_v23_63_app.jsx` (4979 lines)

The new file is **+155 lines vs local**. Local is the post-commit state; the new file
appears to be a parallel branch that does **not** include any of the 11 post-baseline
commits. Each row below is the verdict for one commit.

| # | Hash | Commit | Verdict | Evidence in new file |
|---|------|--------|---------|----------------------|
| 1 | f197bc6 | feat: route LLM calls through /api/llm/proxy via apiPost | **PORT** | Direct `fetch("https://api.anthropic.com/v1/messages", …)` at L2115, L3495. New file has no `import { apiPost }`. |
| 2 | b097be5 | fix: progress rings start at 12 o'clock instead of drifting with pct | **PORT** | All three progress rings still use `strokeDashoffset={circ*0.25}` at L1688, L2263, L2288. No `transform="rotate(-90 …)"`. |
| 3 | 709eda5 | fix: clip calorie/burn rings — R exceeded viewBox for stroke | **PORT** | `const R = 54, circ = 2 * Math.PI * R;` at L2093. Original 54 px radius still in place; needs R=48. |
| 4 | 0148f49 | fix: portal Modal to body so it covers bottom nav on iOS | **PORT** | `Modal` at L638-656 still uses plain `return (…)`. No `import { createPortal }`. No `document.body` arg. |
| 5 | 98c0e89 | fix: raise Modal zIndex from 300 to 500 | **PORT** (folded into #4) | Modal still at `zIndex: 300` at L638. Settings backdrop still at `zIndex: 300` at L4798. |
| 6 | 722f683 | fix: close overlays on tab switch and prevent More/Settings z-index conflict | **PORT** | No `useEffect(() => { if (showSettings) setShowSettings(false); }, [active]);` after the persistence effects at L4690-4695. More button at L4950 still uses `onClick={() => setShowMore(m => !m)}`. |
| 7 | 8f3be23 | fix: settings panel safe-area and z-index handling | **PORT (partial)** | Bottom tab bar has `env(safe-area-inset-bottom, 14px)` at L4899, but settings panel still `bottom: 74` (L4802), `maxHeight: "calc(100vh - 74px)"` (L4807), scrollable content still no safe-area padding (L4824), top-right controls still `top: 14` not `calc(14px + env(safe-area-inset-top))` (L4839), bottom tab bar zIndex still 100 (L4898). |
| 8 | 6e7281e | feat: add safe-area-inset-top padding to all 9 tab content areas | **PORT** | Zero `env(safe-area-inset-top)` instances in new file. Need to add 9 padding changes (Home L964, Challenge L1495, Calories L2098, FoodGuide L2864, Track L3139, Coach L3389, Learn L3460, Community L3571, Mind L3848 in local numbering; offset by ~−3 lines in new file). |
| 9 | 77dcad5 | fix: remove maxWidth 390 constraint for full-width layouts | **PORT** | 6 instances of `maxWidth: 390` still present in new file: L644 (Modal panel), L4742 (splash), L4753 (onboarding), L4789 (main app), L4803 (settings panel), L4860 (more drawer), L4895 (bottom nav). |
| 10 | fa58103 | format v23.jsx | **SKIP** | Whitespace/formatting only (592-line diff, all +/- in indentation/style). No semantic change. |
| 11 | ed70eb3 | feat: delegate lsGet/lsSet to StorageService in v23 | **PORT** | New file `lsGet`/`lsSet` at L4654, L4658 still does raw `localStorage.getItem`/`setItem`. No `import { StorageService }`. |

## Summary

- **9 of 11 commits need to be ported** (#1, #2, #3, #4, #5, #6, #7, #8, #9, #11)
- **1 commit to skip** (#10 — pure formatting)
- #4 and #5 will be ported as a single edit (the local diff folded zIndex + portal together)
- #2 and #3 are related and should be applied together (both touch the same calorie/burn rings)

## Things the new file already has that local does not (just for context, no action)

- `SettingsScreen` has `onDeleteAll` prop (the new file is a newer feature baseline)
- 155 more lines of UI content vs local
- 3-line trim at top (different opening structure)

## Porting strategy

Apply the 9 ports in this order (top of file → bottom) to keep line numbers stable for
each subsequent edit:

1. **#11** (line 1-3): add `StorageService` import + delegate lsGet/lsSet
2. **#1** (line 4, ~2115, ~3495): add `apiPost` import + replace 2 fetch calls
3. **#4+#5** (line ~640): add `createPortal` import + portal Modal + raise zIndex to 500
4. **#2+#3** (~1688, ~2093, ~2263, ~2288): R=48 + rotate(-90) on all rings
5. **#9** (~644, 4742, 4753, 4789, 4803, 4860, 4895): remove `maxWidth: 390`
6. **#7** (~4802, 4807, 4824, 4839, 4898): settings panel & bottom tab fixes
7. **#8** (9 places): safe-area-inset-top on every tab
8. **#6** (~4690, ~4950): close overlays on tab switch
