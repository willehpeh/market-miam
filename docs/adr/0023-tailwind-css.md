# 0023. Tailwind CSS for frontend styling

Date: 2026-06-10 · Status: Accepted

## Context

The frontends need a styling approach that stays consistent across multiple
apps without a hand-maintained design system. Options included per-component
SCSS only, a component library (Material), or utility-first CSS.

## Decision

Use Tailwind CSS v4 (via `@tailwindcss/postcss`) across the frontend apps,
with design tokens in `@theme` (fonts: Inter for body, Plus Jakarta Sans for
display) and shared element styles layered in each app's `styles.css`.
Component-scoped SCSS remains available where utilities don't fit.

## Consequences

- Styling vocabulary is shared across apps; the theme block is the single
  place design tokens live.
- No component library lock-in; markup carries more class noise in exchange.
- Per-vendor theming (ADR 0003) will build on theme variables rather than
  per-vendor stylesheets.
