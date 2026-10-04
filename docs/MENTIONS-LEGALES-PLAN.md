# Mentions légales & privacy policies — plan

Every storefront owes a mentions-légales page naming its vendor as éditeur (ADR 0054), and
registered vendors are owed a privacy policy (`PRIVACY-PLAN.md` §1). Neither exists today, and
one client is already live. The two policies' wording was drafted, checked and approved by a
lawyer on 2026-09-23; this plan is what it takes to ship them with the vendor's legal identity.

The approved wording lives in the doc *Market Miam — politiques de confidentialité
(brouillons)*: **Politique A** (espace traiteur) and **Politique B** (vitrines publiques),
full versions. Copy them verbatim. A rewording goes back to the lawyer. One sentence already
has: on 2026-09-23 the retention line for the legal identity dropped *"reste chiffrée"* for
*"accessible seulement pour répondre à une demande légale"* (`PRIVACY-PLAN.md` §1 rule). The
lawyer hasn't seen that change yet.

## Decisions taken while drafting

| Decision | Where it lands |
|---|---|
| The legal identity outlives erasure by 5 years (décret 2021-1362, host duty), under its own key | ADR 0056 |
| `VendorLegalIdentityProvided` carries its own phone, prefilled from the storefront's | ADR 0056, amends 0054 |
| Honeycomb keeps client IPs and discloses them, for vendors and storefront visitors alike | Both policies |
| Everything ships together: policy A goes live with the mentions légales, not before | This plan |
| US sub-processors rest on the EU-US DPF, all four checked Active on 2026-09-23 | `PRIVACY-PLAN.md` §3 |

## Slices

Each slice is reviewable and committable alone. Deploying is gated by the rollout (slice 8), not by the slices.

| # | Slice | Status |
|---|---|---|
| 1 | Decisions on paper: ADR 0056, amendments to 0054 and 0025, `PRIVACY-PLAN.md` | done |
| 2 | Domain: `ProvideVendorLegalIdentity` → `VendorLegalIdentityProvided` | done |
| 3 | Erasure keeps the `:legal` key and stamps its shred date; shredded keys leave tombstones | done |
| 4 | Read model + HTTP: vendor read/write, éditeur block on the public storefront query | |
| 5 | Vendor app: the legal-identity form, and links to policy A | |
| 6 | Policy A page on the website | |
| 7 | Storefront: the mentions-légales route, and price wording on the carte | |
| 8 | Rollout to the live client | |
| 9 | Readiness gate: `hasCompleteLegalIdentity()` | |

### 2. Domain — shipped (`2a13415`)

- `ProvideVendorLegalIdentity` → `VendorLegalIdentityProvided`, full state, flat payload with
  `null` for absent optionals. Recording the same identity again raises nothing.
  An unregistered vendor is rejected.
- Value objects: `Siret` (Luhn; derives SIREN and TVA), `VatRegime` (`assujetti` | `franchise`;
  no TVA number under franchise), `LegalName`, `BusinessAddress`, `ContactPhone` (required),
  `Mediator` (name and site as a pair), `CompanyDetails` (all four or none).
- Every field except `vendorId` sits in `vendorPiiFields`. `vendorPiiKeyScopes` seals them under
  `{vendorId}:legal`. It is passed to `ShreddingEventStore` and wired through
  `EventSourcingModule.forRoot` in production and the API test apps.
- `Vendor` holds the identity as `LegalIdentityOnRecord`: `NoLegalIdentity` until one is
  recorded, then `ProvidedLegalIdentity`. The latter wraps the event's snapshot raw, without
  re-validating it (ADR 0057). The unchanged-identity no-op is `equals` between the held
  state and a `ProvidedLegalIdentity` built from the payload about to be appended.

### 3. Erasure — shipped (`21a993e`, `5535db4`)

- **Tombstones** (migration 0020): `shred` nulls `wrapped_key` and `key_version`, stamps
  `shredded_at`. `getOrCreateKeyFor` throws on a tombstone; `findKeyFor` → `null` → `SHREDDED`.
  Null `key_version` defeats a racing lazy rewrap and keeps tombstones out of ADR 0040's
  retirement count. Both adapters, via the `DataKeys` contract.
- **Scheduled shred** (migration 0021): `VendorErasure.erase()` calls
  `scheduleShred('{vendorId}:legal', now + 5 years)` (injected `Clock`), stamping `shred_after`.
- **Sweep built, not deferred** (ADR 0056 amendment): `ShredSweep` calls `shredDue(now)` on boot,
  then daily (in-process `timer`). A failed sweep logs; the next tick retries. Assumes the API
  never sleeps; Render Cron Job is the fallback.
- Proof: `vendor-erasure.spec.ts` moves the clock to 5 years − 1 ms (readable) and 5 years
  (`SHREDDED`), driving the injected sweep ticks.

### 4. Read model + HTTP

- `GET`/`PUT` for the vendor, zod at the edge (ADR 0046). The `PUT` dispatches the existing
  `ProvideVendorLegalIdentity`. `vatRegime` is an enum at the edge too.
- `FindCustomerStorefront` carries the éditeur block. The hébergeur block is a constant (Market
  Miam, then Render) and stays out of the payload.
- A rebuild must not re-materialise an erased vendor's legal identity (ADR 0056): it still
  decrypts until its shred date. Open: how the projection knows the vendor was erased —
  removing the row at erasure doesn't survive the next rebuild; a `VendorErased` event would
  (see "Not in this plan").

### 5. Vendor app

- A Signal Forms form. Typing a SIRET prefills it from `recherche-entreprises.api.gouv.fr` (open data, no key), with
  manual entry as the fallback for Sirene non-diffusion.
- The médiateur is **warned, not required** (ADR 0054). Name CM2C, Medicys and AME, and keep
  evidence that the warning was shown.
- State that the phone is published, at the field. Prefill it from the storefront's `phone`
  (ADR 0056).
- Link policy A from the footer (`core/layout.ts`) and from Auth0 Universal Login's privacy-policy
  setting, so it is readable before sign-up.

### 6. Policy A page

`marketmiam.fr/confidentialite-traiteurs` on the Astro site, reusing `mentions-legales.astro`'s
`EDITEUR` constants. It lives on the public site because a vendor must be able to read it before having an account.

### 7. Storefront

- An SSR route under the storefront parent, linked from `StorefrontFooter`. It carries the éditeur
  block, the hébergeur constant, then policy B.
- The carte is labelled as indicative, with the market's list governing (ADR 0054). Under
  franchise, `TVA non applicable, art. 293 B du CGI` sits beside the prices.

### 8. Rollout

Deploy 2–5 and ask the live client to fill in the form. Deploy 6 and 7 only once they have, so the route
never renders an empty éditeur block. Then check their live page.

### 9. Readiness gate

A fourth contributor, reason `legal`, following ADR 0031's table. It comes last because the live client
is already published and the gate only bites at publication.

## Not in this plan

- Stripe and the 10-year invoice rows in policy A come with Billing (ADR 0048).
- Cloudinary's IP masking is a dashboard switch and can be flipped at any time.
- Deleting the Auth0 user on erasure stays manual.
- An erased vendor still rehydrates as registered, so `Vendor` accepts their commands. The
  tombstone refuses PII writes under `{vendorId}` (a 500, not a domain error), but not under
  `:legal`: a vendor erased before providing a legal identity who then provides one mints a
  `:legal` key with no `shred_after`, kept forever. A `VendorErased` event, PII-free and appended
  before the shred, would let the aggregate refuse both with a domain error. That only matters
  until the Auth0 user is deleted by hand. Deferred.
