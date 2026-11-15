# 0069. The Stripe adapter: raw HTTP, one contract, the sandbox nightly

Date: 2026-11-15 · Status: Accepted

Builds on ADRs 0006, 0012, 0060 and 0068.

## Context

The Auth0 adapter set the pattern: one contract, run against an in-memory fake, against the
adapter on an HTTP fake on every push, and against a test tenant by hand, which refuses the
production tenant. The in-memory fake also serves the api's specs and the api run locally with no
Auth0.

Stripe differs:

- **Its preview moves.** The version our setup needs will be replaced, and the setup can change
  with it (Q14). A run by hand would catch that once someone thought to run it, likely after a
  vendor's registration had failed.
- **CI on every push decides deploys**: main deploys once its checks pass.
- **The sandbox can't make the cases that matter most.** It won't time out or answer 5xx on demand,
  which ADR 0068's retry rule rests on.
- **Preview features need Stripe's beta SDKs**, by Stripe's own docs.

## Decision

**Raw HTTP, no Stripe SDK.** Stripe's version is set per call, our own types cover the few fields
we read, and webhook signatures are checked by Stripe's documented scheme.

**One contract for the Stripe port, run three ways:**

1. **An in-memory fake** that speaks the port only, never Stripe's statuses, for Ordering's specs,
   the api's specs and the api run locally with no Stripe key.
2. **The adapter against an HTTP fake**, on every push. It plays the timeouts and 5xx the sandbox
   can't.
3. **The adapter against the sandbox**, nightly and by hand. It refuses a live key, as the tenant
   spec refuses production, and closes every account it creates.

**Each fake has its own job.** The in-memory fake lets a spec prove the retry rule; the HTTP fake
proves the adapter turns timeouts into ambiguous answers, and Stripe's 4xx into final ones.

**The nightly run's key is a restricted sandbox key**, kept as a GitHub secret and used for nothing
else.

**Webhook delivery stays out of CI.** Signatures are checked against vectors the specs build from
the documented scheme; delivery end to end is Stripe's CLI, run locally.

## Consequences

- A red night says the preview or Stripe's answers moved, within a day, and blocks no deploy.
- Stripe's wire format lives in the adapter and its HTTP fake; every other spec speaks the port.
- The signature check is ours to get right, with its spec as the guard.
- The owner creates the restricted key before the first nightly run.

## Rejected

| Option | Why not |
|---|---|
| Only the adapter against an HTTP fake, no in-memory fake | Stripe's JSON would reach every Ordering spec, and a field changed by the preview would break dozens of them |
| The sandbox on every push | A sandbox hiccup would hold back production |
| The sandbox by hand only, like Auth0's tenant | The preview moves without telling us |
| Stripe's beta SDK | A beta package in production, for one call |
| The stable SDK, the preview's fields passed untyped | Two ways of calling Stripe, and the one that matters most is the untyped one |
| `stripe-mock` | Stateless: it can't keep an account between calls, or time out on demand |
| Receiving the sandbox's webhooks in CI | A public endpoint or a running CLI in CI, to test what the signature vectors already prove |
