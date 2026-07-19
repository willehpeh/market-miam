# 0031. Storefront publication: readiness as a cross-aggregate domain service

Date: 2026-07-16 · Status: Accepted

## Context

The customer storefront is public the moment a subdomain row + an open
storefront exist — there is no gate. We want an explicit **publish** step: a
vendor goes live deliberately, and only when the page is presentable.

"Presentable" spans aggregates: storefront info + cover (`Storefront`), at
least one dish (`Catalogue`), at least one market schedule (`Calendar`), and —
once we charge — an active subscription (a future Billing context). That
collides with one-event-per-command / one-aggregate-per-command (ADR 0009):
the command that publishes loads one aggregate, but the invariant needs facts
from several vendor-scoped streams.

## Decision

- **`published` is a lifecycle state on the `Storefront` aggregate**
  (`StorefrontPublished` on `storefront-{vendorId}`), not a new aggregate or
  context. Publishing is vendor *intent* — recorded state, distinct from "the
  data happens to exist" (a vendor with a dish and a schedule may still not want
  to go live).

- **Readiness is a cross-aggregate policy → a stateless domain service,
  `StorefrontPublication`.** An aggregate guards invariants *within its own
  consistency boundary*; "≥1 dish" lives in the Catalogue's. Making the
  storefront reach across boundaries (via injected interface or passed-in
  aggregates) is the reach a domain service exists to own (Evans/Vernon:
  operations spanning multiple aggregates; the way to keep aggregates from
  referencing each other).

- **Synchronous**, chosen over an async `RequestStorefrontPublication` →
  processor → confirm workflow. A processor would only wrap the *same* reads in
  an async envelope — it is not a new source of truth. Readiness today is fast
  local reads, so a synchronous 200/400 with reasons is simpler and better UX.
  Reach for the async form only if readiness becomes slow, external, or a
  genuine multi-step workflow (e.g. manual review).

- **Symmetric readiness.** Each aggregate answers neutral factual self-queries
  in its own language; the *service* owns which are required and the reason
  words, assembling `missing[]`:

  | Contributor | Query | Reason |
  |---|---|---|
  | Storefront | `hasTitle()` | `title` |
  | Storefront | `hasDescription()` | `description` |
  | Storefront | `hasCoverPhoto()` | `cover` |
  | Catalogue | `hasAtLeastOneItem()` | `catalogue` |
  | Calendar | `hasSchedule()` | `schedule` |

- **`Storefront.publish()` guards only what is local** — must be open,
  idempotent (already-published → no-op) — and raises the event. The service
  gates readiness and throws `StorefrontNotReadyToPublish(missing)` (extends
  `DomainError` → 400 with reasons; ADR on domain-error mapping).

- **Thin handler**: load storefront/catalogue/calendar, delegate to the service,
  save the storefront. One aggregate mutated, one event — ADR 0009 preserved;
  the sibling loads are read-only validation.

- **Read gate: a discriminated union** from the public composite —
  **404** (subdomain unresolved) / **coming-soon** (resolves, not published;
  shows the title if set; `noindex`) / **published** (full DTO). Gated on a
  `published` flag projected into `vendor-storefront-view`.

- **Cover is mandatory to *publish*, not to *edit*** — consistent with
  description. Readiness ≠ validity: a draft may lack either; the gate lives in
  the service, never in the value objects.

## Consequences

- The `Storefront` aggregate now **stores name + description**, which it
  previously discarded — `apply(StorefrontInformationEdited)` records them.
  Adds `StorefrontDescription.hasContent()` (the VO trims but *allows* empty, so
  a fired event ≠ content) and `CoverPhoto.isSet()`.

- The aggregate is **not** the sole guardian of the publish invariant — by
  design, because that invariant's data lives outside its boundary. It guards
  its lifecycle; the service guards readiness. Bypass risk (calling `publish()`
  directly) is bounded by the single command handler.

- **Eventually consistent read.** The service checks write-side aggregates
  (read-your-writes at publish time), but the customer path is a projection — a
  just-published storefront goes live once the `published` projection catches up
  (ADR 0002, 0015).

- **Erasure unchanged**: it deletes the subdomain row → 404, which correctly
  beats coming-soon for an erased vendor (ADR 0025). The flag is not PII.

- **Subscription deferred** (`docs/DEFERRED.md`): a separate Billing context,
  shaped now as one more self-query (`subscriptions.isActiveFor(vendor)`) behind
  a local entitlement projection fed by billing events. The service gains one
  clause; the storefront never learns the word.

- The **dev seed** must now provide description + cover + ≥1 dish + ≥1 schedule +
  publish for the demo to render live.

- Builds on ADR 0004 (single BC), 0008 (no getters — the `hasX()` queries),
  0009 (one event / vendor-scoped streams).
