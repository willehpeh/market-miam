# 0069. The Stripe adapter: raw HTTP behind a gateway, one contract, the sandbox nightly

Date: 2026-11-15 · Status: Accepted

Builds on ADRs 0006, 0012, 0046, 0060, 0067 and 0068.

## Context

The Auth0 adapter set the pattern: `vendorAccountsContract`, in `@market-miam/testing`, runs against
`InMemoryVendorAccounts`, against the adapter on `FakeAuth0` on every push, and against a test
tenant by hand (`nx run api:test:tenant`), which refuses the production tenant. The in-memory fake
also serves the api's specs, wired by the test app, and the api run locally with no Auth0.

Stripe differs:

- **Its preview moves.** `2026-10-28.preview` will be replaced, and the setup Q14 rests on can
  change with it. A run by hand would catch a change once someone thought to run it, likely after a
  vendor's registration had failed.
- **CI on every push decides deploys.** `render.yaml` deploys main on `checksPass`.
- **The sandbox can't make the cases that matter most.** It won't time out or answer 5xx on demand,
  which ADR 0068's retry rule rests on, and an account can't take payments without the hosted
  onboarding in a browser.
- **Preview features need Stripe's beta SDKs**, by Stripe's own docs.
- **The sandbox closes the accounts we create** (2026-11-15).

## Decision

**Raw HTTP behind a small gateway**, as `Auth0ManagementApi` does: `fetch`, `Stripe-Version` set
per call, our own types for the few fields we read, no Stripe SDK. Webhook signatures are checked by
Stripe's documented scheme: HMAC-SHA256 of `{t}.{raw body}` with the destination's signing secret,
compared in constant time with each `v1` in `Stripe-Signature`, and refused when `t` is more than
five minutes off.

**One contract, `connectedPaymentAccountsContract`, run three ways.** The port is
`ConnectedPaymentAccounts`: the vendors' accounts as Stripe holds them, named apart from
`PaymentAccounts`, the repository of Ordering's own record of each one (ADR 0068).

1. **`InMemoryConnectedPaymentAccounts`**, for Ordering's specs, the api's specs and the api run
   locally with no Stripe key, as `InMemoryVendorAccounts` is. It speaks the port only,
   "created", "refused, code X", "ambiguous", never Stripe's statuses or requirements.
2. **The Stripe adapter against `FakeStripe`**, an HTTP fake like `FakeAuth0`, on every push. It
   serves the endpoints the adapter calls with just enough state to prove the translation, and
   plays the timeouts and 5xx that must come back ambiguous.
3. **The Stripe adapter against the sandbox**, nightly as a job beside the scenarios in
   `nightly.yml`, and by hand with `nx run api:test:sandbox`. It refuses a live key, `sk_live_` or
   `rk_live_`, as the tenant spec refuses production, and closes every account it creates. It
   covers what only the real thing proves: a token and an account on the preview, the replay of a
   creation, a refusal for a used token, the lookup that finds an account by its registration ID,
   an account fetched and read into our codes, an onboarding link. It doesn't wait out a token's
   hour: `FakeStripe` answers a replay past it with `token_expired`, as the sandbox did on
   2026-11-15, and the processor's spec proves the lookup follows.

**Each fake has its own job**, and the contract holds them together. The in-memory fake, told to
fail ambiguously twice and then succeed, proves the processor retries with the same key and
records no refusal. `FakeStripe`, timing out or answering 503, proves the adapter returns those as
ambiguous, and a 400 `token_already_used` as final.

**The nightly run's key** is a restricted sandbox key, limited to accounts, account tokens, account
links and events, kept as a GitHub secret and used for nothing else.

**Webhook delivery stays out of CI.** Signatures are checked against vectors the specs build from
the documented scheme; delivery end to end is `stripe listen`, run locally.

## Consequences

- A red night says the preview or Stripe's answers moved, within a day, and blocks no deploy.
- Stripe's wire format lives in three places, the gateway, the adapter and `FakeStripe`; every other
  spec speaks the port. When the preview changes a field, those three change.
- The signature check is ours to get right, with its spec as the guard.
- Thin event payloads are ours to type: a few fields, checked by zod at the route (ADR 0046).
- The sandbox stays clean, since each run closes what it made.
- The owner creates the restricted key and adds the secret before the first nightly run.

## Rejected

| Option | Why not |
|---|---|
| Only the adapter against `FakeStripe`, no in-memory fake | Every Ordering spec would seed Stripe's JSON, and a field changed by the preview would break dozens of them. The package specs can't reach `apps/api` anyway |
| The sandbox on every push | A sandbox hiccup would hold back production |
| The sandbox by hand only, like Auth0's tenant | The preview moves without telling us |
| Stripe's beta SDK | A beta package in production, for one call |
| The stable SDK, the preview's fields passed untyped | Two ways of calling Stripe, and the one that matters most is the untyped one |
| `stripe-mock` | Stateless: it can't keep an account between calls, or time out on demand |
| Receiving the sandbox's webhooks in CI | A public endpoint or a running `stripe listen` in CI, to test what the signature vectors already prove |
