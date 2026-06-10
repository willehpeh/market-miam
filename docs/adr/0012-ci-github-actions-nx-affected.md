# 0012. CI on GitHub Actions running nx affected

Date: 2026-05-17 · Status: Accepted

## Context

The monorepo (ADR 0001) needs continuous integration. Running every target
for every project on each push gets slower as the workspace grows; Nx can
compute which projects a change actually touches.

## Decision

A single GitHub Actions job runs `nx affected -t lint`, `test`, and `build`
sequentially (parallel within each target), against Node 24 with `npm ci`.
The checkout uses full history and passes base/head SHAs so affected
detection compares against the right commits.

## Consequences

- CI time scales with the size of the change, not the size of the workspace.
- Sequential targets give a clear failure ordering: lint before test before
  build.
- Affected detection depends on the dependency graph being accurate — another
  reason module boundaries are lint-enforced.
- A single job means no per-project status checks; acceptable at this team
  size.
