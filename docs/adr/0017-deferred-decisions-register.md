# 0017. A register for deferred decisions

Date: 2026-06-06 · Status: Accepted

## Context

Designing the projection/processor machinery surfaced several questions
(polling loop, transactional checkpoints, poison events, Postgres gap
handling, rebuild discrimination) whose answers depend on production
evidence that doesn't exist yet. Deciding them now would be speculation;
forgetting them would be worse.

## Decision

Keep `docs/DEFERRED.md` as a register of deliberately deferred decisions.
Each entry records the question, the current leaning, and what would force a
decision. Items are resolved (and graduated to ADRs if significant) when
real evidence arrives — typically when building the production runtime and
Postgres adapters.

## Consequences

- "Not decided yet" is an explicit, reviewable state rather than a gap.
- Code can stay minimal (e.g. `vendorIdFrom`'s raw cast) without losing the
  rationale for why hardening waits.
- The register is a standing input to production-readiness work; ADRs 0005,
  0015 and 0016 reference it rather than duplicating entries.
