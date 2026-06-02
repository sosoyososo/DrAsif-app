# Safe Area Top Fix — All 9 Tabs Implementation Plan

## Verified Spec
`docs/superpowers/specs/2026-06-02-safearea-all-tabs-design.md`

## Task 1: Group A — Gradient tabs (HomeTab, ChallengeTab, FoodGuideTab, MindTab)

- [ ] **HomeTab L957**: change `padding: "36px 22px 28px"` to `padding: "calc(36px + env(safe-area-inset-top)) 22px 28px"`
- [ ] **ChallengeTab L~1392**: change `padding: "28px 24px 24px"` to `padding: "calc(28px + env(safe-area-inset-top)) 24px 24px"` (find the gradient div inside ChallengeTab, line ~1408 based on pattern)
- [ ] **FoodGuideTab L2862**: change `padding: "28px 20px 24px"` to `padding: "calc(28px + env(safe-area-inset-top)) 20px 24px"`
- [ ] **MindTab L3852**: change `padding: "28px 20px 24px"` to `padding: "calc(28px + env(safe-area-inset-top)) 20px 24px"`

## Task 2: Group B — Plain/header tabs (CaloriesTab, TrackTab, LearnTab, CommunityTab, CoachTab)

- [ ] **CaloriesTab L~1933**: change `padding: "0 18px 110px"` to `padding: "env(safe-area-inset-top) 18px 110px"`
- [ ] **TrackTab L~3094**: change `padding: "0 16px 100px"` to `padding: "env(safe-area-inset-top) 16px 100px"`
- [ ] **LearnTab L~3461**: change `padding: "0 16px 100px"` to `padding: "env(safe-area-inset-top) 16px 100px"`
- [ ] **CommunityTab L~3537**: change `padding: "0 16px 100px"` to `padding: "env(safe-area-inset-top) 16px 100px"`
- [ ] **CoachTab L3395**: change `padding: "20px 18px 8px"` to `padding: "calc(20px + env(safe-area-inset-top)) 18px 8px"`

## Verification

- [ ] Run `grep -n "safe-area-inset-top\|--sa-top" src/dr_asif_v23_app.jsx` — expect 9 matches (bottom nav already uses bottom, so total should be 10 lines referencing safe-area-inset)
- [ ] `npm run build` — verify no errors
- [ ] iOS screenshot (see CLAUDE.md instructions)
- [ ] Android screenshot (see CLAUDE.md instructions)

## Files Modified

- `src/dr_asif_v23_app.jsx` — ~9 lines across 9 tab components