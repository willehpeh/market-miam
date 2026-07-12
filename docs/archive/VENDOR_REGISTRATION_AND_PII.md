# Vendor Registration & PII Handling

> **Archived — shipped.** This is a design record, not a backlog. Crypto-shredding is implemented and deployed: `ShreddingEventStore` + `DataKeys` (in-memory & postgres) in `packages/event-sourcing`, `vendor-pii-fields.ts` (`packages/market-days`), erasure in `apps/api/.../vendor-erasure.ts`, plus contract/round-trip tests. See ADR 0025 and POSTGRES-PLAN item 2 (`2a`/`2b` DONE).

Design decisions for vendor identity, registration events, progressive profile completion, and crypto-shredding of personal data. Captured 2026-06-10.

## Vendor identity

- **vendorId is a random UUID minted by Auth0**, not the Auth0 `sub`. Using `sub` directly was rejected: it bakes a 1:1 user↔vendor assumption into immutable event streams, couples stream IDs to the identity provider (sub changes on connection migration), and leaks `auth0|...` formatting into events, projections, logs, and URLs.
- A pseudonymous UUID vendorId is **not PII** and can live in plaintext in stream IDs, payloads, and metadata.

### Auth0 post-login Action

The vendorId is minted lazily in a **post-login** Action — not a registration trigger, because:

1. Pre/post-user-registration triggers only fire for database/passwordless connections, not social logins.
2. Custom claims can only be added to tokens at login anyway.

```js
exports.onExecutePostLogin = async (event, api) => {
  const { randomUUID } = require('crypto');

  let vendorId = event.user.app_metadata?.vendorId;

  if (!vendorId) {
    vendorId = randomUUID();
    api.user.setAppMetadata('vendorId', vendorId);
  }

  api.accessToken.setCustomClaim('https://market-miam/vendorId', vendorId);
};
```

- Mints once per user (persisted to `app_metadata`), stamps the claim on every login. Existing users are backfilled on next login.
- The API reads the claim from the **verified** token payload: `payload['https://market-miam/vendorId']`. Tokens are signed JWTs (JWS, RS256) — encoded, not encrypted. Never trust without verifying signature, `iss`, `aud`, `exp` against the tenant JWKS.
- The frontend Auth0 SDK must pass an `audience` (the API identifier) or Auth0 issues an opaque token instead of a JWT.
- Token verification is pure adapter concern: the HTTP adapter verifies and extracts the claim; the domain only sees a `VendorId` value object and never knows JWTs exist.
- If teammates-per-vendor arrives later, the Action evolves to look up a shared vendorId instead of minting; the API and event streams never know the difference.

## Registration flow

- Vendors are manually provisioned (Auth0 user created by the operator) for now.
- On first sign-in, the frontend **unconditionally** calls a registration endpoint (e.g. `POST /vendor/registrations`). Explicit command, not middleware magic.
- The `RegisterVendor` handler is **idempotent**: the stream is keyed by vendorId; if `VendorRegistered` already exists, it no-ops. This is simpler and more robust than check-404-then-register.
- `VendorRegistered` payload is `{ vendorId, email, registeredAt }`. The `email` is read from the verified token claim (alongside the `vendorId` custom claim) and captured as a **registered-with snapshot** — it identifies the vendor administratively and pre-populates their profile so they needn't re-enter an address Auth0 already holds. It is **not** their current, editable email: registration is an idempotent no-op, so this value is frozen at first sign-in; updates flow through `UpdateVendorProfile`. The email is PII, so it is encrypted at rest via the crypto-shredding registry below (the pseudonymous `vendorId` and `registeredAt` stay plaintext). No *other* token claims are copied "while you're there".

## Progressive profile completion

Vendors can explore the app before filling in their details.

- `UpdateVendorProfile` command → `VendorProfileUpdated` event (one event per command). The `...Updated` name is honest here because the user-facing action genuinely is "edit my profile form". **Shipped today as** `EditStorefrontInformation` → `StorefrontInformationEdited` (`name`, `description`, `phone`) — the storefront edit *is* the profile surface for now; a distinct profile event carrying address/postcode is still future.
- **Splitting heuristic**: carve a field into its own command/event when the business *reacts* to it differently — e.g. if completing certain fields unlocks publishing listings, that milestone deserves its own event (or a processor watching profile state) rather than being inferred by every consumer from a generic update. Splitting along domain lines is under consideration; the profile contains name, email, business address, and more.
- **Payload shape**: the event carries the **complete resulting profile**, not a field diff. Projections never fold partial diffs; replay stays trivial. Duplication cost is negligible at profile-edit frequency.

## PII: crypto-shredding

The vendor profile contains substantial PII (name, email, business address, phone). Market vendors are often sole traders, so this is personal data under GDPR even in a "business" profile.

**Chosen approach: crypto-shredding** — encrypt PII fields in event payloads with a per-vendor data key held outside the event store; honor erasure by deleting the key, leaving the immutable log intact but those fields permanently unreadable.

Alternatives rejected:
- *Delete the stream*: simpler, but breaks once PII leaks into cross-vendor streams or analytics.
- *PII outside events* (mutable store, events hold references): trivial erasure, but the profile is no longer event-sourced and events stop being self-describing.

Now is the cheapest moment to adopt it: zero existing production events, no streams to migrate.

### Architecture

Crypto-shredding is a **decorator around the `EventStore`/`Events` ports** (`packages/event-sourcing/src/event-store.ts`). The domain, aggregates, and projections never learn it exists. Four pieces:

**1. PII field registry** — declarative, per event type, owned by the bounded context that defines the events; maps merged at composition time:

```ts
export type PiiFields = Record<string, string[]>; // eventType -> payload field names

const vendorPiiFields: PiiFields = {
  VendorRegistered: ['email'],                                   // registered-with email snapshot
  StorefrontInformationEdited: ['name', 'description', 'phone'], // sole-trader identity (published, still shreddable)
};
// Address/postcode aren't captured by any event yet — add them when a profile
// event carries them (see "Progressive profile completion").
```

Unlisted fields stay plaintext, so non-personal *product* data (dish names, prices) remains inspectable in the database. The stall **description** is encrypted, though — it's free text, a PII magnet for a sole trader.

**2. `DataKeys` port** — one data key per *subject* (vendor), not per event:

```ts
export abstract class DataKeys {
  abstract getOrCreateKeyFor(subjectId: string): Promise<Buffer>;     // append path — mints if absent
  abstract findKeyFor(subjectId: string): Promise<Buffer | null>;     // read path — null if absent/shredded
  abstract shred(subjectId: string): Promise<void>;                   // the erasure act
}
```

Adapters: in-memory fake for tests; later a Postgres table `pii_keys(subject_id, wrapped_key, created_at)`. Data keys are stored wrapped by a master key (envelope encryption) — env secret now, cloud KMS on deployment.

**3. Shredding decorator** — implements both `EventStore` and `Events`, wraps the real adapter:

```ts
export class ShreddingEventStore implements EventStore, Events {
  constructor(
    private readonly inner: EventStore & Events,
    private readonly keys: DataKeys,
    private readonly pii: PiiFields,
  ) {}

  async append(streamId, events, expectedStreamPosition, metadata) {
    const subjectId = metadata?.['vendorId']; // existing vendorIdFrom convention
    const encrypted = await this.encryptFields(events, subjectId);
    return this.inner.append(streamId, encrypted, expectedStreamPosition, metadata);
  }

  async load(streamId)      { return this.decryptFields(await this.inner.load(streamId)); }
  async loadFrom(globalPos) { return this.decryptFields(await this.inner.loadFrom(globalPos)); }
}
```

The shredding subject is keyed off metadata already carried on every append (`vendorId`).

**4. Ciphertext format & shredded-read semantics**

- Each listed field's value is encrypted into a self-describing, versioned string: `enc:v1:<iv>:<authTag>:<ciphertext>` (base64 segments). Stored events remain valid JSON.
- When `findKeyFor` returns `null` (shredded), the decorator replaces each PII field with the **`SHREDDED` sentinel** (`'<shredded>'`), not `null` — so read-model columns stay `NOT NULL` and value objects never sit on the `null` path. Verified that `Vendor.apply`/`Storefront.apply` never reconstruct PII value objects (the info lives only in the read model as raw strings), so a shredded stream rehydrates untouched — no VO ever sees the sentinel. A base class making string VOs *accept* the sentinel was rejected: it weakens every PII VO's invariant for a path that doesn't occur (and strict VOs like `Email` reject the sentinel anyway). If a VO ever must be built from a shreddable field, handle the sentinel at that one site.
- **Erasure flow**: `keys.shred(vendorId)` → rebuild projections (clear views, reset checkpoint to 0, replay — purges decrypted PII from read models for free) → delete the Auth0 user (they hold email/password).
- **Read-model decryption boundary — resolved as model A** (storefront view; `POSTGRES-PLAN.md` item 1): the decorator decrypts on both `load` and `loadFrom`, so the projection receives plaintext and the view holds plaintext PII at rest. Erasure is the replay-after-shred flow above — replay rewrites the view with the `SHREDDED` sentinel. B (ciphertext-at-rest / decrypt-at-egress) was set aside: it would need the projection to see ciphertext, which decrypt-on-`loadFrom` rules out without redesigning the decorator.

### Cryptography

Roll the orchestration layer; do **not** roll the crypto:

- **Orchestration (registry + decorator + key table): build it.** No mature Node crypto-shredding library exists; ~150–200 lines plus tests.
- **Primitives: Node built-in `crypto`.** AES-256-GCM, `randomBytes(32)` keys, fresh 12-byte IV per encryption. Pass streamId + event type + field name as GCM additional authenticated data so ciphertext can't be transplanted between events, streams, or fields.
- **Master key management: env secret now, AWS/GCP KMS when deployed** (rotation + audit logs). Behind the `DataKeys` port, so the swap touches one adapter.

### Known extension points & constraints

- **Subject resolution**: today subject = vendorId from metadata. The day customer PII lands in a vendor's stream, the registry must also say *whose* data a field is. Don't build now; known extension point.
- **Aggregate logic**: a shredded stream still replays, with the `SHREDDED` sentinel in PII fields. Keep PII fields out of `apply()` logic that drives state decisions so shredded aggregates rehydrate coherently (verified today: no aggregate reconstructs PII).
- **Never log decrypted payloads.**

### Test list (outside-in, fakes at boundaries)

- Round-trips plaintext for event types not in the registry.
- Stores listed fields unreadable in the inner store.
- Decrypts on `load` and `loadFrom`.
- Returns the `SHREDDED` sentinel for PII fields after shredding.
- Rejects appends with no vendorId in metadata when the event type has PII fields.
- Rejects encrypting a registered PII field whose value is not a string.
- Throws on load when a ciphertext is tampered (GCM auth-tag mismatch) — distinct from the shredded sentinel.
