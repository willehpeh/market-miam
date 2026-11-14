# 0063. Opening and closing a vendor's account are events on their stream

Date: 2026-11-14 · Status: Accepted

Amends ADR 0058 (erasure's reactions stay out of the log) and ADR 0060 (the processor that opens
accounts). Builds on ADRs 0024 and 0025.

## Context

A vendor's sign-in account lives in Auth0. ADR 0060 records the invitation, and a processor opens
the account; slice 5 of the admin plan adds the processor that deletes it once the vendor is
erased. Neither outcome reaches the vendor's stream:

- **Auth0 forgets.** Its logs keep a day on Starter, five on Essentials. After that, nothing says
  when a vendor could first sign in, or that their login was deleted.
- **An erasure cannot show it finished.** `VendorErased` records the order. The key's shredding
  is ours and can be checked at any time; the Auth0 user's deletion happens in someone else's
  system and leaves nothing of ours behind.
- **A stuck processor is invisible per vendor.** On 2026-11-14 an invitation waited for its
  account while Auth0 refused the Management application. The only sign was `/api/health` at
  503, and the account list, read from Auth0, did not show the invitation at all.

## Decision

**Two events on the vendor's stream, carrying no personal data:**

- `VendorAccountOpened { vendorId, openedAt }`: the vendor's account exists in Auth0, opened for
  their invitation.
- `VendorAccountClosed { vendorId, closedAt }`: no account in Auth0 holds the vendor's id any
  more, whether the processor deleted one or found none.

Neither has a field in `vendor-pii-fields.ts`: both stay readable after the shred, as
`VendorErased` does.

**The processors that do the work record it, through commands.** `OpensVendorAccounts` sends
`RecordVendorAccountOpened` when the port answers `open`. `ClosesVendorAccounts`, on
`VendorErased`, asks the port to close the vendor's account, found by `vendorId`, then sends
`RecordVendorAccountClosed`. The date is the processor's clock when it records, seconds after
Auth0 answered. A crash between Auth0 and the record retries both: opening finds the vendor's own
account and answers `open`, closing finds none, and the record follows.

**The account is a fact beside the vendor's lifecycle,** as the legal identity is, not a state in
it:

| `Vendor` state | `RecordVendorAccountOpened` | `RecordVendorAccountClosed` |
|---|---|---|
| new | refused | refused |
| invited | raises `VendorAccountOpened`, then no-op | refused |
| registered | raises `VendorAccountOpened` if not yet recorded, else no-op | refused |
| erased | no-op | raises `VendorAccountClosed`, then no-op |

A vendor can sign in between Auth0 opening the account and the processor recording it, so the
opening may follow `VendorRegistered`. Only erasure closes an account.

**Closing asks Auth0 about every erased vendor.** It does not skip one with no
`VendorAccountOpened`: vendors from before invitations, and those invited before this decision,
have accounts and no such event.

## Consequences

- An erasure is finished when the stream ends `VendorErased`, `VendorAccountClosed`. A stream that
  stops at `VendorErased` is an erasure still under way.
- ADR 0058's erased vendor, final to every command, carries out one: `RecordVendorAccountClosed`,
  whose event carries no personal data. A late `RecordVendorAccountOpened` it accepts and ignores.
- Deleting the Auth0 user, manual under ADR 0058, is the processor's.
- ADR 0058 kept the erasure processor's reactions out of the log, as infrastructure. Keys and the
  subdomain registry are ours and can be checked at any time. Auth0 is not, and its record fades,
  which is why these two are recorded.
- Vendors registered before invitations, and those invited before this decision, have no
  `VendorAccountOpened`. A reader takes a registered vendor without one as holding an account.
- The events have readers from the start: the record of who could sign in and when, and the proof
  an erasure finished. A view of vendors' accounts built from them, showing an invitation whose
  account is pending and an erasure whose login is not yet deleted, could complete or replace the
  account list read from Auth0. That view is not part of this decision.
- `ClosesVendorAccounts` needs `delete:users` on the Management application (admin plan slice 5).
- A new processor reads the log from its start. Deployed, `ClosesVendorAccounts` closes the
  account of every vendor erased before it and records each closed. Without `delete:users`, the
  first of them still holding an account holds it up, and `/api/health` answers 503.
- Auth0's user search takes seconds to see a user just created. A vendor erased within those
  seconds of being invited could be missed: closing would find no account and record it closed,
  while the account remains. An operator erases long after inviting, so it is left open; the
  tenant spec waits for the search before each case that closes an account.
- Closing deletes only users whose `vendorId` is exactly the vendor's, whatever the search
  answers: Auth0's user search is full-text.

## Rejected

| Option | Why not |
|---|---|
| No events: Auth0 is the record | Its logs fade within days, an erasure could not show it finished, and a stuck processor shows only on `/api/health` |
| Log lines instead | A log line fades too, Honeycomb's after 60 days, and nothing reads it per vendor |
| `VendorAccountClosed` only when an account was deleted | A stray invitation, or an account deleted by hand, would end its stream otherwise, and a reader could not tell a finished erasure from one under way |
| Skipping Auth0 for a vendor with no `VendorAccountOpened` | Vendors from before invitations have accounts without it |
| The account on a stream of its own | Splits the vendor's history, and the `Vendor` aggregate could no longer guard what may follow erasure |
| The account as a lifecycle state, between invited and registered | The vendor can register before the opening is recorded; a fact beside the lifecycle takes either order |
