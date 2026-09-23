# 0056. The vendor's legal identity outlives erasure, under its own key

Date: 2026-09-23 · Status: Accepted

Amends ADR 0054 (vendor legal identity) and ADR 0025 (crypto-shredding).

## Context

ADR 0054 puts the vendor's legal identity in `vendorPiiFields`, so erasure shreds it with
everything else. It notes that art. 6-II LCEN is satisfied as a side effect: we hold what a
lawful request would ask for. That holds only while the account lives. Décret 2021-1362 makes
a host keep the civil identity of whoever published content for **5 years after the account
closes**. Shredding the legal identity at erasure breaks that duty on the day it starts.

ADR 0025 has one data key per vendor, subject `vendorId`, resolved from event metadata. So no
field can survive a shred that the rest does not. ADR 0054 also reuses the storefront's `phone`
as the LCEN phone, and that field sits under the same key.

The reading of the décret was put to a lawyer with the privacy-policy wording (2026-09-23) and
not contested.

## Decision

**A second key per vendor, subject `{vendorId}:legal`.** The shredding event store resolves the
subject per event type: `VendorLegalIdentityRecorded` encrypts under `{vendorId}:legal`, and
every other PII-bearing event under `{vendorId}` as now. This is the extension point ADR 0025
named ("per-field subject mapping"), taken at the event level because one event holds one
purpose.

**Erasure defers the legal key's shred instead of performing it.** `VendorErasure.erase()`
shreds `{vendorId}` as today and stamps `shred_after = now + 5 years` on the `:legal` key's row
(`data_keys.shred_after`, null for every other key). Until then the identity stays encrypted and
unpublished, readable only by operator tooling answering a lawful request.

**The legal identity carries its own phone.** It is prefilled from the storefront's, then
held under `:legal`. This replaces ADR 0054's "reuse `phone`": the storefront phone dies at
erasure, but the one the décret asks for must not.

**No projection may re-materialise it after erasure.** A rebuild replays
`VendorLegalIdentityRecorded` and it still decrypts. Any read model holding it must drop a vendor
whose `{vendorId}` key is gone. The public 404 comes from the deleted subdomain (ADR 0031) and
does not make that redundant.

## Consequences

- `DataKeys` gains `scheduleShred(subjectId, at)`. The sweep that shreds keys past `shred_after`
  is **deferred**: the earliest it can be due is five years after the first erasure. Until it
  exists, a forgotten date is the failure mode, so the column is the reminder.
- The art. 30 register records two retentions for one vendor. The account data is kept for the
  account's life, under *contrat*. The legal identity is kept for the page's life plus 5 years,
  under *obligation légale*. Policy A tells vendors both, with the exception stated.
- An erased vendor's right to erasure does not reach the legal identity for those 5 years.
  Art. 17-3-b covers that (erasure yields to a legal obligation).
- 5 years is one constant. If the reading changes, shortening it is a config edit, not a
  migration.

## Rejected

| Option | Why not |
|---|---|
| Shred at erasure, as ADR 0054 had it | Breaks the host's retention duty the day it starts |
| Legal key without the phone | The phone is part of the civil identity the décret names |
| Copy the identity to a plaintext retention table at erasure | PII leaves the crypto-shredding model; a second erasure path to get right |
| One key, delay the whole shred 5 years | Keeps the login email and the storefront's name and description for no legal reason |

Builds on ADRs 0024, 0025, 0031, 0039, 0040, 0054.
