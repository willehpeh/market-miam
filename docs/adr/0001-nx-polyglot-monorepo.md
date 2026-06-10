# 0001. Nx polyglot monorepo with scoped package boundaries

Date: 2026-05-01 · Status: Accepted

## Context

Market Monster spans several deliverables — a backend API, vendor and customer
frontends, a marketing website — that share a domain model and supporting
libraries. Separate repositories would mean versioning and publishing shared
packages; a single-framework workspace would force one stack onto every
deliverable.

## Decision

Use a single Nx workspace containing all apps (`apps/`) and shared libraries
(`packages/`), each framework free to differ per app. Shared code is imported
via `@market-monster/*` path aliases, and the `@nx/enforce-module-boundaries`
lint rule enforces dependency constraints between projects.

## Consequences

- One toolchain (lint, test, build) across all projects; CI runs only affected
  projects.
- Shared domain packages are consumed directly — no publishing or version
  skew.
- Architectural boundaries are enforced mechanically rather than by
  convention.
- All projects move on the same dependency versions, so upgrades are
  workspace-wide events.
