# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`docs/MARKET_MIAM.md`** — this repo's domain context document: the problem, the aggregates and their vocabulary, the event catalog, and what's built vs not.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in (`docs/adr/README.md` is the index).
- **`docs/EVENT-SOURCING-ARCHITECTURE.md`** — when working on the event store, subscriptions, projections, or observability.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `docs/MARKET_MIAM.md`. Don't drift to synonyms the doc explicitly avoids — public-facing vocabulary is the product's (*vitrine*, *carte*, *menu*, *traiteur*), not the code's internal names.

If the concept you need isn't in `MARKET_MIAM.md` yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (flag it so the doc gets extended).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
