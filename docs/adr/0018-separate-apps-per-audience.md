# 0018. Separate frontend apps per audience

Date: 2026-06-07 · Status: Accepted

## Context

Three audiences need a web surface: vendors running their business,
customers browsing vendor sites, and prospects visiting the product's
marketing site. One application with role-based routing would couple their
release cadence, bundle weight, and rendering strategy.

## Decision

Three apps in the monorepo: `vendor-frontend` (Angular SPA),
`customer-frontend` (Angular), and `website` (Astro static marketing site).
Each is built and deployed independently; shared code lives in packages.

## Consequences

- Each app picks the rendering strategy its audience needs (see ADR 0019)
  and ships without dragging the others along.
- The marketing site uses a content-first framework (Astro) instead of
  paying SPA costs for static pages.
- Auth complexity stays in the vendor app; customer surfaces aren't gated by
  vendor login machinery.
- Cross-cutting UI (theming, shared components) needs a shared package if
  duplication appears — none yet.
