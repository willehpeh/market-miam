# 0068. One payment account per vendor, connected after publication, created once

Date: 2026-11-15 · Status: Accepted

Builds on ADRs 0015, 0031, 0058, 0059, 0063, 0066 and 0067.

## Context

Step 1 of the ordering board: a vendor connects Stripe, and their storefront takes orders once the
account can take payments (R4). The board settled the rules R1 to R4, the Connect setup (Accounts
v2, direct charges, the Express Dashboard, Stripe collecting its fees from the vendor and covering
losses) and the prefill from the mentions légales, sent to Stripe from the vendor's browser as an
account token (R3).

The sandbox settled more on 2026-11-15, from the French platform:

- Only `2026-10-28.preview` creates our setup; the general release refuses it, but reads the
  account back and makes its onboarding link (Q14).
- The token can't carry acceptance of Stripe's terms: Stripe collects the requirements on our setup,
  and refuses an acceptance made on the vendor's behalf.
- A token lives an hour and makes one account: sent again with a new key, it is refused.
- A creation replayed with the same key returns the account already made, straight away and 11
  minutes later, but only while the token lives: after its hour, the replay answers
  `token_expired`, since Stripe checks the token before it looks up the key.
- Connected accounts can be listed by creation date, with their metadata.
- An account can't take a hold until its onboarding is done.
- An account holding money can't be closed. An Express vendor can reach their dashboard through
  Stripe's own login, without our app.

## Decision

**Ordering keeps its own record of each vendor's payment account**: whether a registration is
open, the account's ID, whether card payments are active, whether it is retired. That is what its
rules decide on, and nothing else of Stripe's is kept (board, Q1).

**A vendor registers once their storefront is published.** Before that, registration is refused,
naming what is missing as publication's own refusal does (ADR 0031). Publication requires a
complete legal identity, so the prefill has its source; the live client, published before that
rule, fills in their mentions légales first, by hand (board, R3).

**One registration at a time, each made once.** The vendor app gives each registration its ID and
makes the account token at the tap. A resent request is a quiet success; a second registration
while one is open is refused.

**The account is created once per registration.** The registration's ID is the idempotency key, the
vendor's and the registration's IDs go in the account's metadata, and the token carries no
acceptance of Stripe's terms. Only the creation names the preview version (Q14).

**Only Stripe's final answers refuse a registration.** Anything ambiguous, a timeout, a dropped
connection, a 5xx or a 429, is retried with the same key. A token error is not final on its own: a
lost success retried past the token's hour answers `token_expired`, so before recording a refusal
on one, Ordering looks for an account carrying the registration's ID. This inverts the board's
"any error not known to be passing counts as a refusal", which would turn a lost success into a
failure, and the vendor's next tap into a second account.

**What Stripe says of the account is recorded as observations, one fact at a time**: confirmed,
card payments active or not, an issue open or resolved. Each is recorded only when it changed, and
only for the vendor's current account, since notices about an old account keep coming for months.

**One account per vendor.** A rejected or closed account shows as card payments inactive; the
vendor is told to get in touch and can't register again. Replacing an account, after a change of
legal entity, a rejection or the preview's end, becomes an operator action (ADR 0059), designed
with its first case.

**Erasure retires the record and leaves the Stripe account open.** Once the vendor is erased,
registration is refused and observations are ignored. The account may hold money and face
disputes for months, and Stripe won't close an account with a balance; the vendor reaches it
through Stripe's own login, and the operator tells them so at erasure.

**What stays after erasure stays in clear**: the registration's ID, the account's ID, the
observations and the retirement. Orders keep their account ID in clear anyway (the plan's
"pseudonymous, not anonymous"), and refunds and disputes on past orders keep arriving. For an
entrepreneur individuel the account ID points to a person through Stripe, so policy A names it,
and Stripe as a controller in its own right; the lawyer's brief asks, beside Q10, what must be kept
and for how long.

## Consequences

- A double tap, a resent request, a replay and a lost answer, even one retried past the token's
  hour, all end in one account.
- Step 1 asks Market Days one thing, whether the storefront is published, and reacts to one event,
  the vendor's erasure.
- The live client's prefill rests on a manual step: their mentions légales before they connect.
- A vendor whose account dies waits on the operator.
- Alerts: a confirmation for a vendor who already has another account; the stuck-subscription alert
  for a creation retrying while Stripe is down.

## Rejected

| Option | Why not |
|---|---|
| Registering before publication | Stripe checks the account against a storefront that isn't live, and the one-shot prefill can't be redone, since each vendor gets one account |
| Requiring a complete legal identity as well | The owner's call: publication only. Only the live client is published without one, and they are handled by hand |
| A registration ID given by the server | A request resent by a flaky connection would come back an error though the first had worked |
| Counting every error not known to be transient as a refusal (the board's rule) | A lost success becomes a failure, and the vendor's next tap a second account |
| Counting a token error as final without looking | The same, once a lost success's retries outlast the token's hour |
| Re-registering after Stripe rejects the account | A vendor Stripe turned down for fraud could make another account with a tap |
| One observation holding the account's whole state | Every reader would diff states to find what changed, and the vendor app pushes on payments stopping |
| Closing the Stripe account at erasure | Money and disputes outlive the vendor's time with us, and Stripe refuses an account with a balance |
| Sealing the account ID under the vendor's key | Orders keep it in clear, so sealing it here would protect nothing |
