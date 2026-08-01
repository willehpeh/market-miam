# 0042. LISTEN lifecycle: single-use adapter, reified connection, boot rejects

Date: 2026-08-01 · Status: Accepted

## Context

The M7 finding, plus one defect found while fixing it. In
`PostgresNotifications`: (1) `start()` resolved even when the first
connection failed — the error routed into the reconnect machinery, so a
permanently misconfigured LISTEN connection (bad connection string, revoked
grant) booted "healthy" and surfaced only as read models lagging behind the
poll timer, with nothing alerting on the status stream; (2) `stop()` never
completed `pokes` or `statuses`, leaking the observable contract on
shutdown; (3) the reconnect `attempt` counter survived a stop/start cycle;
and (4) — discovered during the fix — restart was a silent no-op anyway,
because `stop()` set a `stopped` latch nothing ever cleared.

Structurally, all four were one mistake: the class managed two different
lifetimes — the *service's* (start → stop, once per app) and *each
connection's* (open → lost, many per service) — with one set of flags
(`stopped`, `reconnecting`, `attempt`, `timer`, `client`).

## Decision

Three moves; each deletes a bug class rather than patching symptoms.

1. **Instances are single-use.** One `start()`, one `stop()`, one lifetime; a
   second `start()` throws; restart means constructing a new instance. Every
   actual user already behaved this way (the DI singleton lives exactly as
   long as the app; container specs build a fresh instance per test), so no
   call site changes. Problems 3 and 4 stop being bugs to fix and become
   states that cannot exist, and `stop()` completing both subjects (fix 2)
   becomes the natural end of the object's life rather than a
   contract-management problem entangled with restart semantics.
2. **First connection failure rejects `start()` and schedules nothing.** The
   caller — `onApplicationBootstrap` — decides, so a misconfigured LISTEN
   connection fails the deploy pointing at the real error. This matches the
   codebase's fail-loud-at-boot pattern (`masterKeyring`, `Migrations` — the
   latter already makes an unreachable database fail boot, so this adds no
   new fragility for transient outages). The `never-connected`-status
   alternative was rejected as silent in practice: nothing alerts on
   `statuses` today (O11Y-PLAN gap), so a status is a signal into the void.
   Runtime losses after a successful start keep the existing posture:
   capped exponential backoff, re-LISTEN, catch-up poke.
3. **The connection is its own object.** A private `ListeningConnection`
   owns one client for one lifetime: `open()` returns a fully wired,
   LISTENing connection or throws — no half-connected object ever exists —
   and exposes `lost`, a promise that settles exactly once with the cause of
   death. This dissolves the remaining machinery: the `error`/`end`
   double-fire needs no debounce (a promise settles once — the
   `reconnecting` flag's job is now a property of promises); boot-vs-
   reconnect needs no flag choreography (policy lives at `open()`'s two call
   sites — `start()` calls it bare, the recovery loop calls it in a
   try/catch); and "is this my current client?" checks vanish (a connection
   only reports its own death). The supervisor's reconnect story becomes one
   linear coroutine — await death, announce, back off, reopen, announce,
   catch up, repeat — with `attempt` as a loop variable that cannot leak.
   Shutdown rides the same signal path as a crash: `close()` settles `lost`,
   the loop wakes, sees stopped, unwinds.

Also rejected: **modelling the retry pipeline in rxjs** (`retry`/`repeat`
operators) — the policy is asymmetric (first failure throws to boot, later
failures retry with numbered announcements and a catch-up side effect), and
encoding that in operator configuration trades linear control flow for
cleverness; the hand-rolled posture of this file (see its `ponytail:` note)
exists to avoid exactly that.

State inventory: five mutable fields (`client`, `stopped`, `reconnecting`,
`attempt`, `timer`) became two (`connection`, write-once `stopped`) plus the
single-use guard and a cancellable-delay handle.

## Consequences

- A deploy with a bad LISTEN configuration fails at boot with the driver's
  error, instead of running with silently minute-lagged read models.
- `stop()` is idempotent (the container suite's `afterEach` relies on this)
  and terminal: subscribers receive completion. First `dropped` status now
  reports `attempt: 1` (the attempt in progress) where the old code reported
  `0`; the pinned `reconnected.attempt` numbering is unchanged.
- Behaviour otherwise preserved exactly: status states, backoff sequence and
  cap, catch-up poke after reconnect, ReplaySubject(1)-for-status semantics,
  and the `TracingPostgresNotifications` wrapper (unchanged — its spans get
  more truthful, since a failed boot now throws instead of emitting a
  misleading dropped-then-retry sequence).
- The lifecycle is now testable without a database: the injected client
  factory takes a stub, and `postgres-notifications.spec.ts` pins boot
  rejection, single-use, reconnect policy, attempt numbering, double-fire
  collapse, and stop semantics in the fast suite. Container specs keep what
  needs a real socket, plus two additions: terminal events on `stop()`, and
  the disconnect-window scenario (kill the connection, append during the
  gap, assert the catch-up poke delivers) — the one reconnect case the
  suite didn't cover. Container specs were authored without Docker in this
  environment (same caveat as ADR 0040/0041).
