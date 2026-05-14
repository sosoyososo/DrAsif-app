# Per-Tab Top Safe Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `env(safe-area-inset-top)` padding to each of the 8 tab pages, handled per the page's top visual element type (gradient banner vs plain text header).

**Architecture:** 8 inline style changes in a single JSX file. No new CSS classes, no new DOM elements, no external dependencies. Gradient tabs get extra `paddingTop` on the gradient div so the background extends upward; plain tabs get `env(safe-area-inset-top)` added to existing `paddingTop` values.

**Tech Stack:** React inline styles, CSS `env()`, CSS `calc()`

**Spec:** `docs/superpowers/specs/2026-05-14-safearea-tabs-design.md`

---

### Task 1: Gradient banner tabs — Home, Challenge, Mind

**Files:**
- Modify: `src/lose_weight_smarter_v19.jsx` (3 locations)

Add `paddingTop: "calc(N + env(safe-area-inset-top))"` to each gradient banner's inline style, where N is the current padding-top value from the existing `padding` shorthand. This keeps the original spacing intact while adding safe area space above.

- [ ] **Step 1: HomeTab — gradient div**

Change line 944-947 from:
```jsx
      <div style={{
        background: `linear-gradient(135deg, #0F2D4A 0%, #1A4A6E 60%, #1A7A6E 100%)`,
        margin: "0 -16px", padding: "36px 22px 28px",
        marginBottom: 16,
      }}>
```
to:
```jsx
      <div style={{
        background: `linear-gradient(135deg, #0F2D4A 0%, #1A4A6E 60%, #1A7A6E 100%)`,
        margin: "0 -16px", padding: "36px 22px 28px",
        marginBottom: 16,
        paddingTop: "calc(36px + env(safe-area-inset-top))",
      }}>
```

- [ ] **Step 2: ChallengeTab — gradient div**

Change line 1380 from:
```jsx
      <div style={{ background: `linear-gradient(160deg,${cfg.color},#0F2D4A)`, margin: "0 -18px", padding: "28px 24px 24px", marginBottom: 18 }}>
```
to:
```jsx
      <div style={{ background: `linear-gradient(160deg,${cfg.color},#0F2D4A)`, margin: "0 -18px", padding: "28px 24px 24px", marginBottom: 18, paddingTop: "calc(28px + env(safe-area-inset-top))" }}>
```

- [ ] **Step 3: MindTab — gradient div**

Change line 3265-3267 from:
```jsx
      <div style={{
        background: `linear-gradient(135deg, #3D2A5E, #6B4C8A 60%, #9B7AB8)`,
        padding: "28px 20px 24px", marginBottom: 0,
      }}>
```
to:
```jsx
      <div style={{
        background: `linear-gradient(135deg, #3D2A5E, #6B4C8A 60%, #9B7AB8)`,
        padding: "28px 20px 24px", marginBottom: 0,
        paddingTop: "calc(28px + env(safe-area-inset-top))",
      }}>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lose_weight_smarter_v19.jsx
git commit -m "fix: add top safe area padding to gradient banner tabs (Home, Challenge, Mind)"
```

---

### Task 2: Plain background tabs — Calories, Track, Coach, Learn, Community

**Files:**
- Modify: `src/lose_weight_smarter_v19.jsx` (5 locations)

For each plain tab, add `env(safe-area-inset-top)` to the `paddingTop` value of the title header div. Use `calc()` to preserve the existing intended spacing.

- [ ] **Step 1: CaloriesTab**

Change line 1921 from:
```jsx
      <div style={{ paddingTop: 22, marginBottom: 14 }}>
```
to:
```jsx
      <div style={{ paddingTop: "calc(22px + env(safe-area-inset-top))", marginBottom: 14 }}>
```

- [ ] **Step 2: TrackTab**

Change line 2383 from:
```jsx
      <div style={{ paddingTop: 22, marginBottom: 18 }}>
```
to:
```jsx
      <div style={{ paddingTop: "calc(22px + env(safe-area-inset-top))", marginBottom: 18 }}>
```

- [ ] **Step 3: CoachTab**

Change line 2808 from:
```jsx
      <div style={{ padding: "20px 18px 8px", flexShrink: 0 }}>
```
to:
```jsx
      <div style={{ padding: "20px 18px 8px", flexShrink: 0, paddingTop: "calc(20px + env(safe-area-inset-top))" }}>
```

- [ ] **Step 4: LearnTab**

Change line 2880 from:
```jsx
      <div style={{ paddingTop: 22, marginBottom: 20 }}>
```
to:
```jsx
      <div style={{ paddingTop: "calc(22px + env(safe-area-inset-top))", marginBottom: 20 }}>
```

- [ ] **Step 5: CommunityTab**

Change line 2993 from:
```jsx
      <div style={{ paddingTop: 24, marginBottom: 20 }}>
```
to:
```jsx
      <div style={{ paddingTop: "calc(24px + env(safe-area-inset-top))", marginBottom: 20 }}>
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lose_weight_smarter_v19.jsx
git commit -m "fix: add top safe area padding to plain tabs (Calories, Track, Coach, Learn, Community)"
```
