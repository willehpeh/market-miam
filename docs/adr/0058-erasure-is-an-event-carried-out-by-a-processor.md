# 0058. Erasure is an event, carried out by a processor

Date: 2026-10-05 · Status: Accepted

Amends ADR 0025 (crypto-shredding) and ADR 0056 (legal identity outlives erasure).

## Context

`VendorErasure.erase()` did every step in one call: shred, rebuild the storefront view,
free the subdomain. Nothing reached the log.

- A crash between steps left a half-erased vendor, and nothing retried it.
- A rebuild could not tell the vendor was gone. The legal identity's key outlives erasure
  by five years (ADR 0056), so any read model holding it would replay it in plaintext.
- `Vendor` still rehydrated as registered, and accepted commands after erasure.

## Decision

**The operator dispatches `EraseVendor`, which raises `VendorErased { vendorId, erasedAt }`.**
It carries no PII, so it stays readable after the shred.

| `Vendor` state | `EraseVendor` | `RegisterVendor`, `ProvideVendorLegalIdentity` |
|---|---|---|
| unregistered | `VendorNotRegisteredError` | as before |
| registered | raises `VendorErased` | as before |
| erased | no-op | `VendorErasedError` (400) |

**The `ErasesVendors` processor carries it out.** It shreds `{vendorId}`, schedules
`{vendorId}:legal` for `erasedAt + 5 years`, and frees the subdomain. Each step is safe to
repeat, so the subscription's retry finishes an interrupted erasure. The date comes from
the event, so a retry yields the same date.

**Read models holding the vendor's data drop their row on `VendorErased`**
(`vendor-storefront-view`, `vendor-legal-identity-view`). A rebuild replays the event after
the data, so it lands in the same place. This replaces the rebuild at erasure.

## Consequences

- An erased vendor's `GET /storefront` is a 404, not a body of `SHREDDED`.
- An erased vendor whose Auth0 user still exists gets a 400 on login, because the app
  registers on boot. Deleting the Auth0 user stays manual.
- `Storefront` is a separate aggregate and does not know about the erasure. A storefront
  edit after erasure hits the tombstone and gets a 500, not a domain error.
- A future read model holding vendor PII must handle `VendorErased`.
- The processor's reactions are infrastructure (keys, registry), not commands.

## Rejected

| Option | Why not |
|---|---|
| Keep erasure synchronous, with the event added first | A crash after the event leaves PII readable, with no retry |
| Detect erasure in projections from the `SHREDDED` email | Coupled to a sentinel and to event order |
| No legal-identity read model; load the `Vendor` stream per request | Against the read side's CQRS; a stream load on every public view |

Builds on ADRs 0015, 0025, 0031, 0054, 0056.
