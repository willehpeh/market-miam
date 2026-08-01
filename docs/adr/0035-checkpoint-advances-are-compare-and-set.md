# 0035. Checkpoint advances are compare-and-set; the checkpoint is a fencing token

Date: 2026-08-01 · Status: Accepted

## Context

The W3 finding: the checkpoint upsert accepted any value — including one lower
than the current position — and nothing prevented two writers from running the
same subscription concurrently. The two failure scenarios that made this High:

- **Concurrent instances.** Nothing conditions polling on identity, so every
  api instance polls every subscription. Steady state runs one instance, but
  Render's zero-downtime rollout overlaps old and new instances on **every
  deploy** — interleaved `read → handle → write` cycles could double-process
  events and move the checkpoint backwards.
- **The rebuild race.** `Subscriptions.rebuild()` reset the checkpoint while
  the background poller might be mid-poll. Because `loadFrom` decrypts PII at
  load time, an in-flight batch loaded *before* a crypto-shredding erasure
  could land plaintext rows *after* the rebuild's reset — and advance the
  checkpoint past them, so the replay never overwrote them. Silent success on
  a GDPR path.

Candidate fixes — an in-process mutex gating `poll()` against `rebuild()`, a
monotonic `WHERE position < EXCLUDED.position` guard, per-subscription
advisory locks — each closed one interleaving and left others open (the
monotonic guard, notably, never fires in the rebuild race: after reset-to-0
every stale write is a *forward* write).

## Decision

**Advancing a checkpoint requires naming the position you believe it holds.**
The port is `advance(from, to)`; the Postgres adapter compiles it to
`UPDATE … WHERE subscription_name = $1 AND position = $2`, and zero rows
updated throws `CheckpointConflictError`. `reset()` — used only by rebuild —
is the one unconditional write, returning the position to 0.

Because the advance runs inside the same per-event transaction as the
handler, a conflict rolls the handler's effects back with it. That single
property resolves every interleaving at the database, with no coordination
machinery:

- A poll in flight across a rebuild expects a pre-reset position; its next
  advance conflicts, its transaction — including any stale-plaintext view
  write — rolls back, and the retry re-reads from 0. The erasure race is
  closed regardless of timing, batch contents, or which instance polls.
- Two instances contending during a deploy overlap resolve per event: the
  loser's transaction rolls back, so each event's effects commit exactly once.
- Backwards moves are impossible by construction — exact-match is strictly
  stronger than a monotonic guard.

A conflict is an expected outcome, not a failure: `Subscriptions` logs it
quietly and lets the existing backoff retry re-read the checkpoint.

Rejected:

- **Per-consumer mutex (gate) around poll/rebuild** — closes the rebuild race
  on one instance only; deploy overlaps still race, leaving a "don't run an
  erasure mid-deploy" process rule. In-process locks cannot fence a second
  process.
- **Monotonic guard alone** — never fires in the rebuild race (stale writes
  after a reset are forward writes); prevents only the third-replay symptom.
- **Per-subscription advisory locks** — real ownership, but session-scoped
  locks demand a dedicated pinned connection with its own lifecycle, and
  prevention adds nothing CAS doesn't already give projections. Revisit only
  if per-event conflict contention ever becomes a measured problem.

## Consequences

- Deleting the `WHERE position = $2` clause, or downgrading `advance` back to
  an unconditional write, reopens W3 — the contract test "rejects an advance
  from a pre-reset position" pins the fencing behaviour in both adapters.
- Exactly-once holds for effects that live **inside** the per-event
  transaction. For processors this is conditional on W2 (appends must enlist
  in the ambient UnitOfWork so a rolled-back dispatch takes its appends with
  it). Until W2 lands, a conflict can roll back a processor's checkpoint but
  not its already-appended commands; today's only processor
  (`opens-storefronts`) is idempotent-guarded, so this is latent, not live.
- **External side effects are the boundary of the guarantee.** An email or
  payment call cannot roll back, so CAS demotes it to at-least-once. The rule
  for the first processor that performs one: the effect must carry the
  idempotency key `${subscriptionName}:${event.id}` (event `id`s are minted
  once at append and immutable — exactly the stable identity a dedup key
  needs), sent to a provider that deduplicates. No outbox: the event log
  already is the durable intent record and the checkpoint already is the
  delivery cursor; a claims ledger keyed `(subscription_name, event_id)` is
  the fallback only for a keyless provider where duplicates genuinely hurt.
- Rebuild deliberately leaves the background poller running; post-reset polls
  contend benignly through the same CAS. If contention noise ever matters,
  pause the poker stream — but correctness no longer depends on it.
