# F1 — The api suite fails one random HTTP test in roughly one run in nine

| | |
|---|---|
| Severity | Low — never observed in CI; a local-only annoyance (see *Environment*) |
| Area | `apps/api` test harness, supertest |
| Files | `apps/api/src/app/testing/api-test-app.ts`, every `apps/api/**/*.spec.ts` driving HTTP |
| Status | **Open** — characterised, cause not found |
| Found | 2026-08-19, investigating a failure during `npm run test:all` |

## Issue

A full `nx test api` run fails exactly one test, roughly one run in nine, with:

```
FAIL  |api| src/app/market-days/storefront-publish.spec.ts > publishes a storefront that meets every requirement
Error: socket hang up
```

The test is different every time — `storefront-publish`, `market-schedule`,
`market-day-close`, `public-storefront` have all been seen. It is always an HTTP
test driven by supertest, and the error is always `socket hang up` (ECONNRESET on
the client): the server closed the connection without responding. No assertion
ever fails; the request never completes.

## Evidence

Measured across ~120 full runs of the suite.

| Condition | Failures | Note |
|---|---|---|
| Baseline | ~6/33, then 1/12, 1/24, 1/14 | pooled ≈ 9/83 ≈ 11% |
| The failing spec run **alone**, repeatedly | 0/6 | never reproduces in isolation |
| `--no-file-parallelism` | 1/4 | not cross-worker contention |
| Harness `app.listen(0)` once instead of supertest's per-request listen | 2/8 | unchanged |
| Live polling disabled everywhere | 0/10 | see *False leads* |
| `in-memory-polling.spec.ts` (the only fake-timer spec) excluded | 1/10 | not that file |
| Probe attached, writing a log per socket/response event | 0/36 | heavy sync I/O; plausibly just slows everything |
| `server.closeAllConnections()` before `app.close()` | 1/24 | no effect |
| …plus `await setImmediate` after close | 1/14 | no effect |

## Environment

**Not seen in CI.** CI is `ubuntu-latest`; this was measured on macOS. Since the
flake reproduces with `--no-file-parallelism`, concurrency is not the difference —
what is left is the TCP stack: macOS here allocates ephemeral ports from
49152-65535 and holds TIME_WAIT for 15s, where Linux uses a wider range and
recycles far more readily. A run cycles a few hundred ephemeral binds through one
process, so per-process port reuse on macOS is the leading remaining candidate,
and it revives the ephemeral-port family that the per-request-listen experiment
was wrongly taken to close (that experiment removed supertest's *per-request*
bind, not the per-app one).

Caveat on the CI evidence: CI runs `nx affected`, so the api suite executes only
when api or a dependency changed, and Nx caching skips unchanged inputs. "Never in
CI" therefore covers fewer api executions than total CI runs — at ~11%, twenty
api-affected runs would predict about two failures.

**The decisive experiment** is to run the suite on Linux (a container will do) for
≥24 runs. If it does not reproduce there, this is a macOS-only development
annoyance and should be closed as accepted rather than chased.

## What is ruled out

- **Test parallelism.** Reproduces with `--no-file-parallelism`.
- **supertest's *per-request* bind, specifically.** Each
  `request(app.getHttpServer())` calls `listen(0)` and closes after the response,
  so a run does ~200 bind/close cycles; making the harness listen once collapses
  that to one per app and did not change the rate. This does **not** close off
  ephemeral-port reuse in general — one bind per app still cycles ~40 ports per
  run, and that is the candidate *Environment* above points at.
- **The background poller**, and the one spec that enables it. Excluding
  `in-memory-polling.spec.ts` left the rate unchanged.
- **Lingering sockets at teardown.** Destroying them with `closeAllConnections()`,
  and yielding the event loop after `app.close()`, both left the rate unchanged.

## False leads, recorded so they are not re-run

Two zero-failure results were read as signal and were not:

- **Polling disabled: 0/10.** At an ~8-11% rate, ten clean runs happen about 35%
  of the time by chance. A follow-up excluding the only spec that enables polling
  gave 1/10, contradicting it.
- **Probe present but inert: 0/12.** Same arithmetic — ~37% likely by chance. It
  was used to argue the race lived in teardown timing, and the two fixes that
  story motivated (above) both failed to move the rate.

**Any hypothesis here needs ≥24 clean runs to mean anything**, and ~50 to claim a
fix. Twelve is noise.

## Where to look next

Nothing has yet observed the **server's** side of the dead connection. The probe
that tried to attach `clientError`, socket `error` and response `close` listeners
was abandoned because writing per event suppressed the flake — but the interesting
signal is narrow, so the next attempt should record only:

- responses that close with `writableEnded === false` (the server-side signature)
- `clientError` on the server
- socket `error` events

…into an in-memory ring buffer, flushed **only** from the `afterEach` of a failed
test, so nothing is written on the happy path.

Also worth checking, both unexamined: whether the vitest worker is recycled between
files in a way that abandons an app mid-teardown, and whether the OTel
`AsyncLocalStorageContextManager` in the tracing decorators holds a socket-bearing
context across the app boundary.

## Interim

Left as-is, and there is no CI cost to justify urgency. `--retry=1` on the api
target would hide it locally at the cost of hiding real intermittent failures too,
so it is not proposed.
