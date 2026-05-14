# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-file React application — the "Lose Weight Smarter" companion app by Dr. Asif. Built as one monolithic JSX file (~4061 lines, 274KB) with no build tooling, no bundler, no external React dependencies beyond a CDN import. All state is persisted to `localStorage`.

## Architecture

Single-file SPA (`lose_weight_smarter_v19.jsx`) with inline styles, no CSS modules or external stylesheets. Fonts loaded from Google Fonts (`DM Sans`, `Cormorant Garamond`) via `<link>` tags.

### Component Tree

```
App (export default)
├── SplashScreen — full-screen brand intro
├── OnboardingScreen — gender selection + optional personalised plan calculator
├── HomeTab — daily plan, check-in, meal overview, protein calculator
├── ChallengeTab — 12-week ABS-X challenge with phase tracking, daily logging
├── CaloriesTab — food/exercise log with calorie tracking
├── TrackTab — weight/waist/photo progress charts (inline SVG)
├── CoachTab — motivational guidance, principles, tips
├── LearnTab — chapter summaries
├── CommunityTab — verified reviews, community guidelines
├── MindTab — mindset, habit formation, quiz
├── SettingsScreen — profile editing, gender toggle, data management
└── Shared UI components: Card, SectionTitle, Pill, Modal, InfoRow, LogoMark, LogoFull
```

### Data Layer

- **Meal Plans**: `PLANS` object (lines 128-237) — male/female book-based meal plans with exact calories, macros, and Dr. Asif's commentary
- **Personalised Calculator**: `PersonalisedPlanCalculator` uses Mifflin-St Jeor equation for BMR, activity multipliers for custom targets
- **Persistence**: `lsGet`/`lsSet` wrappers for `localStorage` — each state slice syncs via `useEffect`
- **State Management**: All state lives in `App` and is passed down via props (no Context, no external state library)

### Design Tokens

The `T` object (lines 6-46) defines the colour palette. Deep navy primary, teal accent, gold warm accents, sage for success states.

### Key Patterns

- Mobile-first: max-width 390px container, bottom tab bar, bottom-sheet modals
- Fixed positioning for bottom nav and settings button
- Inline SVG for charts and the logo
- No routing library — `active` state string switches via `renderTab()`
- All data is book-derived (Dr. Asif's "Lose Weight Smarter" 2nd edition)

## Development

### Running the App

Built with Vite + React. Deployed to iOS/Android via Capacitor.

```bash
npm run dev          # dev server with HMR
npm run build        # production build to dist/
```

### iOS Capacitor (Makefile)

```bash
make ios-list                            # list available iOS targets
make ios-dev                             # build → sync → run (default device)
make ios-dev TARGET=00008030-00123456    # build → sync → run (specific device)
```

### Common Tasks

No test suite, no linting config.

### Adding Features

Most changes involve:
1. Modifying the `PLANS` data object for meal/nutrition data
2. Adding/editing a tab component (each gets a section in the file)
3. Adding tabs to `PRIMARY_TABS` or `MORE_TABS` arrays
4. Adding state + `useEffect` for new `localStorage` persistence

### Code Style

- Inline styles only (the `T` design tokens object)
- Multi-line JSX wrapped in parentheses
- Functional components with explicit prop destructuring
- Section comments with `// ───` separator pattern
- No TypeScript, no PropTypes
