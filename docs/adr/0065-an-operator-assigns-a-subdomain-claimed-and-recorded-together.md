# 0065. An operator assigns a vendor's subdomain once, claimed and recorded in one transaction

Date: 2026-11-14 · Status: Accepted

Amends ADR 0032 (the subdomain assigned out of band). Extends ADR 0035 (the ambient unit of work)
to a command. Builds on ADRs 0003, 0025, 0028, 0055, 0058, 0060 and 0063.

## Context

Every new vendor waits on hand-written SQL for their subdomain, and a storefront cannot publish
without one (ADR 0032). ADR 0032 foresaw a `SubdomainAssigned` command; since ADR 0060, a vendor
has a `vendorId` from their invitation, so the address can be ready before their first sign-in.

Two things must hold together:

- **A subdomain is one vendor's, and a vendor has one subdomain.** The `subdomain_registry`
  table's two unique columns hold that across vendors. No vendor's stream can, since none sees
  another's.
- **The assignment is recorded**: who gave which vendor which name, and when. A table row says
  only what is, and erasure deletes it. ADR 0063 recorded the account's opening and closing for
  the same reason.

## Decision

**An operator assigns a subdomain from the admin app**: `PUT /api/ops/vendors/:vendorId/subdomain
{ subdomain }`, behind the operator guard, so the operator's Auth0 id reaches the event's metadata.

**One transaction claims the name and records it.** `AssignSubdomainHandler` runs its work in the
ambient unit of work (ADR 0035): it loads the vendor, who decides; registers the name in
`subdomain_registry`; and appends `VendorSubdomainAssigned { vendorId, subdomain, assignedAt }` to
the vendor's stream. A name another vendor holds fails the registration, and nothing is appended.
An append that fails rolls the registration back. In memory, `UnitOfWork.none()` runs the same
steps in the same order.

This is the first command to run in a transaction. Processors already do, each command they send
committing with their checkpoint, and the registry and the event store both go through the same
unit of work. Claiming then recording, each committed on its own, would leave a name in use with
no record whenever a crash fell between the two: the gap ADR 0063 closed for accounts.

**The subdomain is personal data** when it names a person, as `chez-mohamed` does. In the event it
is encrypted under the vendor's key and shredded with it (ADR 0025). The registry keeps it in plain
text, as it always has, and erasure deletes the row (ADR 0058).

**What a subdomain may be**, checked by a `Subdomain` value object:

- A DNS label, in lower case: letters, digits and hyphens, 3 to 63 characters, starting and ending
  with a letter or a digit, with no `--` (which keeps punycode's `xn--` out). Two letters would read
  as a country code.
- Not reserved: `admin`, `api`, `app` and `www`, which Market Miam serves, and `mail`, `staging`
  and `status`, kept for what it may serve.

**Once only.** A vendor keeps the subdomain they were given: their printed QR codes carry it
(ADR 0055).

| Vendor | `AssignSubdomain` |
|---|---|
| new | refused: `VendorNotInvitedError` |
| invited or registered, with no subdomain | raises `VendorSubdomainAssigned` |
| holding this subdomain already | records it if no event has, else nothing |
| holding another | refused: `SubdomainAlreadyAssignedError` |
| erased | refused: `VendorErasedError` |

A name another vendor holds is refused with `SubdomainTakenError`.

**The route answers** 204 once assigned, or when the vendor already holds that name; 409 when the
name is another vendor's or the vendor holds another; 400 when the name is malformed or reserved,
or the vendor is unknown or erased.

**The admin app** offers, on each row with a `vendorId` and no subdomain, a field and an *Assign*
button. An accepted assignment shows the row's storefront address at once, until the next load.

## Consequences

- No vendor waits on SQL to publish. The operator still assigns, as ADR 0032 has it: a vendor
  cannot choose their own.
- An invited vendor can find their address waiting at their first sign-in.
- Subdomains assigned by SQL before this decision have no event. Assigning a vendor the name they
  already hold records it, and changes nothing else.
- `AssignSubdomainHandler` takes a `UnitOfWork`. Its spec runs with `UnitOfWork.none()`; the api's
  Postgres scenarios cover the real transaction, the vendor's lifecycle assigning through the route
  in place of SQL.
- The appends' global lock (ADR 0028) is held no longer than for any append: the name is
  registered first, and the lock is taken at the append and released at the commit that follows.
- Erasure frees the name for another vendor, as before, and shreds the event's copy.

## Rejected

| Option | Why not |
|---|---|
| Claim, then record, without a transaction | A crash between the two leaves a name in use with no record, ADR 0063's gap. Re-running would mend it, if anyone noticed |
| Record, then claim in a processor | Two operators racing for one name would both record it, and the loser's event would be false |
| The events alone, the registry their projection | Nothing would check a name across vendors before it was recorded |
| The vendor picks their own subdomain | While vendors are few, a name wants an operator's eye: reserved words, trademarks, taste. Self-service can come with sign-ups |
| Renaming a subdomain | Printed QR codes carry the old address. It waits for a need |
| The subdomain in plain text in the event | A name that is a person's must die with the vendor's key |
