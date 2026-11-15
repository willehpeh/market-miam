# 0070. Module boundaries are enforced by two tags: where a project runs and what it is

Date: 2026-11-15 · Status: Proposed

Makes ADR 0001's boundary enforcement real. Enforces ADRs 0048 and 0066's dependency rules.

## Context

ADR 0001 says `@nx/enforce-module-boundaries` enforces dependency constraints, "mechanically
rather than by convention". Its only constraint was `* → *`, and every project's tags were empty:
nothing was enforced. The rules the ADRs state held by convention alone:

- a context depends on `event-sourcing`, `shared-kernel` and `common` only, never on another
  context (ADRs 0048 and 0066);
- `event-sourcing` knows no domain: on 2026-11-15 it stopped reading `vendorId` from metadata, and
  the vendor-scoped helpers moved into the shared kernel;
- the frontends load no server code, and code that ships loads no test fakes.

Ordering is about to become the second context, the first that could reach into Market Days.

## Decision

**Every project carries two tags.**

| Project | Where it runs | What it is |
|---|---|---|
| `common` | `scope:shared` | `type:util` |
| `event-sourcing` | `scope:server` | `type:platform` |
| `shared-kernel` | `scope:server` | `type:kernel` |
| `auth`, `auth-nestjs` | `scope:server` | `type:auth` |
| `market-days`, and `ordering` when it lands | `scope:server` | `type:context` |
| `test` | `scope:server` | `type:testing` |
| `api` | `scope:server` | `type:app` |
| `vendor-frontend`, `customer-frontend`, `admin-frontend`, `design-showcase`, `website` | `scope:client` | `type:app` |

**Each type depends only on the types below it**, in the root `eslint.config.mjs`:

| A project tagged | may depend on |
|---|---|
| `type:util` | `type:util` |
| `type:platform` | `type:util` |
| `type:kernel` | `type:util`, `type:platform` |
| `type:auth` | `type:util`, `type:kernel`, `type:auth` |
| `type:context` | `type:util`, `type:platform`, `type:kernel` |
| `type:testing` | everything but apps |
| `type:app` | everything but apps; `type:testing` only from test files |

**And each scope only on itself and `scope:shared`**: the browser never loads server code, nor the
server the browser's. `scope:shared` depends only on `scope:shared`.

**An app's test files may use the test project; the code it ships may not.** Specs, scenarios,
the tenant contract and the `testing/` folders (`*.spec.ts`, `*.scenario.ts`, `*.tenant.ts`,
`**/testing/**`) may import `@market-miam/testing`; a second rule block refuses it everywhere else.

Nx's own check for circular dependencies stays on. `packages/design-system` is CSS and fonts, not
an Nx project, and stays on the rule's `allow` list.

## Consequences

- Ordering importing Market Days fails lint, as does `event-sourcing` importing the shared kernel,
  the kernel importing a context, a frontend importing a server package, and shipped api code
  importing the test project. Each was tried on 2026-11-15 and refused.
- The code as it stood on 2026-11-15 passes unchanged: the tags describe the graph, they don't move
  it.
- A new project must be tagged. An untagged library can't be imported by a tagged project, so the
  omission shows at its first import. `packages/ordering` takes `scope:server` and `type:context`.
- A shared library the frontends need joins `scope:shared`, and must then depend on nothing that
  runs only on the server.

## Rejected

| Option | Why not |
|---|---|
| One dimension, the type alone | Apps may use almost everything, so nothing would stop a frontend importing `market-days` |
| A tag per context (`context:market-days`) and a rule per pair | `type:context` already forbids every context from depending on any other; per-pair rules grow with each context and say nothing more |
| Leaving enforcement to review | It was, and ADR 0001's promise went unkept for six months |
