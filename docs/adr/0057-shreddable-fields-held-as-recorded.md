# 0057. Shreddable fields are held as recorded, not re-validated

Date: 2026-10-04 · Status: Accepted

Amends ADR 0007 (value objects validated in constructors).

## Context

ADR 0007 has rehydration go through validating constructors, so a payload that no longer
satisfies current invariants fails at load. `Catalogue`, `MarketDay`, `Calendar` and
`Storefront`'s cover photo all do this in `apply`.

PII fields cannot. Once a subject's key is deleted, `ShreddingEventStore` reads every PII
field back as the `SHREDDED` sentinel (ADR 0025, ADR 0039). `<shredded>` fails `Siret`,
`Email` and `Url`, so an aggregate that re-validated PII would throw at every load once its
history had been erased.

Two aggregates already hold PII raw: `StorefrontInformation` and `Vendor`'s legal identity.
Both comments cite ADR 0039 for "rehydration must never validate history". ADR 0039 says
no such thing — it covers the store's read path, not aggregate state. The exception was
real but unrecorded.

## Decision

**A field listed in a PII registry (`vendorPiiFields`, and any later context's registry) is
held in aggregate state as recorded.** A state object wraps the snapshot from the event
and answers the aggregate's questions about it, without building the field's value
objects. Every other field keeps ADR 0007's rule.

- PII is validated on the way in, when the command's value objects are built. The write
  path stays strict.
- The raw snapshot is not a trusted-construction bypass. No `Siret` or `Email` instance
  exists for it, so no invalid instance can. The state holds what was recorded, typed as
  recorded.
- The state object is the one place the event's payload type appears in the aggregate, so
  a new event version changes that class only.
- Aggregates do not branch on `SHREDDED`. Questions asked of held PII must tolerate it.
  Today the only question is an equality check, which is safe: a sentinel never equals a
  validated value.
- Writes against a shredded subject are refused by the key store, not the aggregate
  (`ORDERING-PLAN.md` "Keys": tombstones for vendor keys, expiry for day keys).

Rejected:

- **Sentinel-aware rehydration**: rebuild through constructors unless the payload carries
  `SHREDDED`, with a third "shredded" state. It keeps ADR 0007 without exception, but every
  PII-holding state learns the sentinel and grows a class. And the shredded state has no
  sensible answer to give, since a shredded subject can no longer write.
- **Dropping shredded events at the store**: it hides facts the aggregate needs, such as
  "an identity was recorded", and makes replay depend on key state.

## Consequences

- Corrupt PII in history is not caught at load. That is acceptable: it was validated when
  written, and the AEAD seal fails loudly on tampering (ADR 0041). Integrity is still
  checked, by the cipher instead of the constructor.
- `storefront/storefront-information.ts` and `vendor/legal-identity.ts` cite this ADR
  instead of ADR 0039.
- Ordering's day-sealed fields (customer email, collection code) follow the same rule.
