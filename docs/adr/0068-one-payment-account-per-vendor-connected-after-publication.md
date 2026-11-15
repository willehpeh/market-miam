# 0068. One payment account per vendor, connected after publication, created once

Date: 2026-11-15 · Status: Accepted

Builds on ADRs 0009, 0015, 0031, 0058, 0059, 0063, 0066 and 0067.

## Context

Step 1 of the ordering board: a vendor connects Stripe, and their storefront takes orders once the
account can take payments (R4). The board settled the events, the rules R1 to R4, the Connect setup
(Accounts v2, direct charges, the Express Dashboard, Stripe collecting its fees from the vendor and
covering losses) and the prefill from the mentions légales, sent to Stripe from the vendor's browser
as an account token (R3).

The sandbox settled more on 2026-11-15, from the French platform:

- Only `2026-10-28.preview` creates our setup; the general release refuses it. The general release
  reads the account back and makes its onboarding link (Q14).
- The token can't carry acceptance of Stripe's terms. Stripe collects the requirements on our
  setup, and refuses an acceptance made on the vendor's behalf
  (`tos_acceptance_on_behalf_not_allowed`).
- A token lives an hour, by its `expires_at`, and makes one account: sent again with a new key, it
  is refused with `token_already_used`.
- v2's idempotency holds only while the token lives. A replay with the same key returns the
  account already created, straight away and 11 minutes later with the token already used. After
  the token's hour it answers `token_expired`: Stripe checks the token before it looks up the key,
  so the 30 days of Stripe's v2 overview don't hold for this call. Failed work is finished rather
  than repeated. v1's 24 hours and saved responses govern the payment calls of later steps, not
  this one.
- Connected accounts can be listed by creation date with their metadata, `GET /v1/accounts`, a
  top-level list and so immediately consistent. Our v2 accounts appear there; closed ones don't.
- An account can't take a hold before its onboarding is done: "Your account cannot currently make
  charges".
- The sandbox closed accounts of our setup, though Stripe's reference lists
  `stripe_loss_liable_cannot_be_deleted` for it; an account holding money is refused
  (`cannot_delete_account_with_balance`).
- An Express vendor can reach their dashboard at `connect.stripe.com/express_login`, without our
  app, in live mode.

## Decision

**The payment account is part of the merchant.** In Ordering the vendor is the merchant
(ADR 0048), one `Merchant` aggregate per vendor, on `ordering-merchant-{vendorId}` (ADR 0009),
saved through `Merchants`, built on the shared kernel's `VendorScopedRepository`. Its payment
account is a piece of its state, `PaymentAccountOnRecord`: none, registering, confirmed or
retired, with the account's ID and whether card payments are active. Market Days holds the vendor's Auth0 account
the same way, as `AccountOnRecord` inside `Vendor` (ADR 0063). The rush pause (board, step 2)
joins the merchant later, so R4's "does this vendor take orders now?" is one question on one
aggregate: card payments active, and ordering not paused.

**Registering.** `POST /api/payment-account/registrations { registrationId, accountToken }`,
behind the vendor's guard.

- The vendor app mints the registration ID, a new UUID per tap, and makes the token at the tap, just
  before the call, never on page load.
- Refused until the storefront is published, asked through Market Days' published query
  (ADR 0066). The refusal lists what is missing, `publication`, in the shape publication's own
  refusal uses (ADR 0031). Publication requires a complete legal identity, so the prefill has its
  source, except for the live client, published before that rule: they fill in their mentions
  légales first, by hand (board, R3).
- The same registration ID again is a quiet success. Another one is refused while a registration
  is open, once an account exists, or once it is retired.
- It records `PaymentAccountRegistrationStarted { registrationId, accountToken }`.

**Creating.** `CreatesPaymentAccounts` reacts, calls Stripe, and on success writes nothing (R2):

- `POST /v2/core/accounts` with `Stripe-Version: 2026-10-28.preview`, on this call only; the
  registration ID as the idempotency key; the vendor ID and the registration ID in the account's
  metadata; the token, with no terms accepted in it.
- Only a final answer is a refusal. A 4xx with Stripe's code sends
  `FailPaymentAccountRegistration`, which records
  `PaymentAccountRegistrationFailed { registrationId, code }`; the vendor can tap again.
- A token error, `token_expired` or `token_already_used`, can hide a success whose answer was lost,
  once retries outlast the token's hour, and the processor can't tell a first attempt from a retry.
  So on a token error it first looks for an account carrying the registration ID in its metadata,
  among accounts created since the registration started. Found, it records nothing, and the
  account's notice confirms the registration. Not found, the refusal is recorded.
- Anything ambiguous, a timeout, a dropped connection, a 5xx or a 429, throws. The subscription
  rolls the event back with its checkpoint and retries it with the same key (ADR 0015); while the
  token lives, v2's replay tells the truth. While Stripe is down the processor waits, and the
  stuck-subscription alert fires.
- This inverts the board's "any error not known to be passing counts as a refusal", which would
  turn a lost success into a failure, and the vendor's next tap into a second account.

**Observing.** On each notice, `ChecksPaymentAccounts` (ADR 0067) sends one command per aspect,
every time and in this order, each carrying the account ID it observed:

| Command | Records, if that aspect changed |
|---|---|
| `RecordPaymentAccountConfirmed` | `PaymentAccountRegistrationConfirmed { accountId }`, ending the registration |
| `RecordCardPayments(active \| inactive, code)` | `PaymentAccountEnabled`, or `PaymentAccountDisabled { code }` |
| `RecordPaymentAccountIssue(code, deadline \| none)` | `PaymentAccountIssueDetected { code, deadline }`, or `PaymentAccountIssueResolved` |

Each handler compares its own aspect and records at most one event (ADR 0009), or nothing. Codes
are ours: the adapter translates Stripe's statuses (board, step 1). Observations of any account but
the current one are ignored, since notices about an old account keep coming for months: refunds,
disputes, its closing. A confirmation for a vendor who already has another account is ignored and
raises an alert.

**One account per vendor.** Stripe rejecting or closing the account shows as
`PaymentAccountDisabled` with a code such as `rejected` or `closed`; the vendor app says to get in
touch, and ordering stays shut (R4). The vendor can't register again. Replacing an account, after a
change of legal entity, a rejection or the preview's end (Q14), becomes an operator action behind
the operator audience (ADR 0059), designed with its first case.

**Erasure.** `RetiresPaymentAccounts` reacts to `VendorErased` (ADR 0066) with
`RetirePaymentAccount`, recording `PaymentAccountRetired { accountId, retiredAt }`, with no account
ID if none was confirmed. After it, registration is refused, every observation is ignored, and R4's
gate stays shut.

- The Stripe account is left open and dormant. It may hold money, disputes reach it for months, and
  Stripe refuses to close an account with a balance. The vendor reaches it at Stripe's own login,
  and the operator tells them so at erasure, by hand. Closing an account that never took a payment
  would be possible; not now.
- When orders exist, an erasure with orders in flight releases their holds, refunds paid orders
  not yet collected at once (the board's "vendor left early"), and emails the customers as usual:
  their day's key lives until the day ends. The admin app may warn the operator; it never blocks.

**What stays after erasure.** The registration ID, the account ID, the statuses and the retirement,
in clear: no field of the payment account is in a personal-data registry. Orders keep their account
ID in clear anyway (the plan's "pseudonymous, not anonymous"), and refunds and disputes on past
orders keep arriving. The account token's ID stays too, used and expired. For an entrepreneur
individuel the account ID points to a person through Stripe, so policy A names it, and Stripe as a
controller in its own right for its identity checks; the lawyer's brief asks, beside Q10, what must
be kept and for how long.

## Consequences

- Ordering's facts about a vendor live on one stream, the merchant's; the events keep their
  `PaymentAccount` names, and the merchant holds the rest of what Ordering knows of the vendor as
  it comes.
- A double tap, a resent request, a processor's replay and a lost answer all end in one account,
  even a lost answer whose retries outlast the token.
- Step 1 asks Market Days one thing, whether the storefront is published, and reacts to one event,
  `VendorErased`.
- The preview is pinned on one call. Upgrading it is a one-line change, proved by the next nightly
  sandbox run (ADR 0069).
- The live client's prefill rests on a manual step: their mentions légales before they connect.
- A vendor whose account dies waits on the operator, and the operator's route waits on its first
  case.
- Alerts: a confirmation for a vendor with another account; the stuck-subscription alert for a
  creation retrying while Stripe is down.

## Rejected

| Option | Why not |
|---|---|
| A payment-account aggregate of its own, `ordering-payment-account-{vendorId}` | It would split "does this vendor take orders?" across streams once the rush pause lands, and Market Days already keeps a vendor's outside account inside the vendor (ADR 0063) |
| Registering before publication | Stripe checks the account against a storefront that isn't live, and the one-shot prefill can't be redone, since each vendor gets one account |
| Requiring a complete legal identity as well | The owner's call: publication only. Only the live client is published without one, and they are handled by hand |
| A registration ID minted by the server | A request resent by a flaky connection would come back an error though the first had worked |
| Counting every error not known to be transient as a refusal (the board's rule) | A lost success becomes a failure, and the vendor's next tap a second account |
| Counting a token error as final without looking | The same, once a lost success's retries outlast the token's hour |
| Re-registering after Stripe rejects the account | A vendor Stripe turned down for fraud could make another account with a tap |
| One event holding the whole observed state | Simpler to write, but every reader would diff states to find what changed, and the vendor app pushes on *Disabled* itself |
| Closing the Stripe account at erasure | Money and disputes outlive the vendor's time with us, and Stripe refuses an account with a balance |
| Sealing the account ID under the vendor's key | Orders keep it in clear, so sealing it here would protect nothing |
