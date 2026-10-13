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
| 4 | Read model + HTTP: vendor read/write, éditeur block on the public storefront query | done |
| 5 | Vendor app: the legal-identity form | done |
| 6 | Policy A page on the website, and links to it | done |
| 7 | Storefront: the mentions-légales route, and price wording on the carte | done |
| 8 | Rollout to the live client | |
| 9 | Readiness gate: `hasCompleteLegalIdentity()` | done |

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
- **Scheduled shred** (migration 0021): erasure calls `scheduleShred('{vendorId}:legal',
  +5 years)`, stamping `shred_after`. Done by `ErasesVendors` from `erasedAt` since slice 4.
- **Sweep built, not deferred** (ADR 0056 amendment): `ShredSweep` calls `shredDue(now)` on boot,
  then daily (in-process `timer`). A failed sweep logs; the next tick retries. Assumes the API
  never sleeps; Render Cron Job is the fallback.
- Proof: `erase-vendor.spec.ts` moves the clock to 5 years − 1 ms (readable) and 5 years
  (`SHREDDED`), driving the injected sweep ticks.

### 4. Read model + HTTP — shipped (`d30f77b`, `465e5b9`, `8123e69`)

- **Erasure is an event** (ADR 0058): `EraseVendor` → `VendorErased`; `ErasesVendors` shreds,
  schedules `:legal`, frees the subdomain. Erased `Vendor` refuses `RegisterVendor` and
  `ProvideVendorLegalIdentity` (`VendorErasedError`, 400). `VendorErasure` deleted.
- **`vendor-legal-identity-view`** (migration 0022, jsonb snapshot): latest identity per vendor;
  `VendorErased` deletes the row, so a rebuild never re-materialises it.
- **`GET`/`PUT /legal-identity`**: `PUT` dispatches `ProvideVendorLegalIdentity`; `GET` returns
  what the vendor typed (no SIREN/TVA), 404 until provided. zod checks shape only — `vatRegime`
  is `z.string()`; the value object owns the rule (ADR 0046).
- **Éditeur block** on `FindCustomerStorefront` (published only; `null` until provided), derived
  in the API: `publicationDirector` (représentant légal, else the vendor), `company` (société
  only, with SIREN), `mediator` (pair or null), `vatNumber` (null under franchise). Same payload
  as the storefront feed, no extra endpoint. The hébergeur block stays a frontend constant.

### 5. Vendor app — shipped (`91b140e`, `1db1cd1`, `87f58de`, `db1bb44`)

- **Form** at `/dashboard/legal-identity` (`apps/vendor-frontend/src/app/legal-identity/`), Signal Forms.
  EI / société switch; the société's four fields are required together, and sent as `null` for an EI.
- **Médiateur evidence:** an empty médiateur needs the vendor to tick an L616-1 acknowledgement
  next to links to CM2C, Medicys and AME. The form cannot send a null médiateur without it, so
  each `VendorLegalIdentityProvided` with `mediatorName: null` is the evidence, read alongside
  the form's git history. No event field. The tick starts unticked on every edit (ADR 0054 amendment).
- **SIRET:** Luhn-checked in the form (a copy of `Siret`'s rule; the API stays the authority)
  before any lookup or save.
- **Prefill:** the `CompanyRegistry` port. `RechercheEntreprisesCompanyRegistry` calls the API from
  the browser (CORS open) and keeps a result only when an establishment carries the exact SIRET.
  It fills dénomination (`nom_raison_sociale`, else `nom_complet`), the establishment's address,
  and EI vs société. Nothing found, or the API down → "introuvable", manual entry. `FakeCompanyRegistry` in specs.
- **Phone** prefilled from the storefront's until an identity is on record; the field says it is published.
- **Contact email** is required and starts empty, unlike ADR 0054's "default it": the frontend
  doesn't expose the login email, and a vendor's login is often not the address they publish.
- **Entry point:** the live client was published before this existed, so setup steps never reach
  them. The dashboard loads the identity with its other feeds and waits on it (load gate), then shows
  "Complétez vos mentions légales" on both homes while `GET` is 404. The published home lists
  "Mentions légales" permanently. A failed load (unknown) shows no card.
- **Store:** 404 means none provided, not an error. Once known or saved, the identity is not
  refetched, so the projection's lag cannot take a save back. A save goes home after
  `SAVED_REDIRECT_DELAY`; a refused one says so under the button.
- **Policy A link moved to slice 6**: a link pushed in 5 would 404 until 6, and policy A goes
  live with the mentions légales.
- Not built: forme juridique, capital and ville du greffe are not prefilled. The API gives only
  a `nature_juridique` code and neither of the others.
- Not verified in a running app: covered by the vendor-frontend suites (545 green) only.

### 6. Policy A page — shipped (`f10ba08`, `30646f7`)

- `marketmiam.fr/confidentialite-traiteurs` (`apps/website/src/pages/confidentialite-traiteurs.astro`),
  on the public site so a vendor can read it before having an account. In the sitemap.
- Wording copied from the approved doc. A build-output check confirmed every sentence is there
  unchanged. One difference: the responsable line takes the address from `EDITEUR`, so it reads
  "Romainville, France".
- `EDITEUR` moved to `src/editeur.ts`, and the legal pages' header, footer and styles to
  `layouts/Legal.astro`. `mentions-legales` renders the same text as before.
- Linked from the vendor app's footer ("Confidentialité", signed in or not) and from the
  legal-identity form.
- **No Auth0 step.** New Universal Login, which passwordless uses, has no privacy-policy URL field.
  Its workarounds are Page Templates, Forms for Actions or going back to Classic Login, and none is
  needed: every vendor reaches Auth0 from the app's landing page, whose footer already links
  policy A. That is how it is readable before sign-up.
- Pushed with 7 (Rollout), so policy A goes live with the mentions légales.
- "Ce qui est obligatoire" says a storefront without legal identity and phone can't be published.
  Slice 9 makes that true.

### 7. Storefront — shipped (`93558b5`, `945206f`, `305ec06`)

- **`/mentions-legales`** (`apps/customer-frontend/src/app/storefront/mentions-legales/`), a child of the
  storefront parent, so it reads the same feed fetch. The éditeur block comes from the API's `editeur`:
  legal name, a société's form, capital and RCS, address, SIRET, the TVA number or `TVA non applicable,
  art. 293 B du CGI`, contact, directeur de la publication, and the médiateur when there is one. Then
  the hébergeur: Market Miam, hosted by Render. Then policy B, checked word for word against the doc,
  with the vendor's legal name for `{traiteur}`. Own canonical URL.
- **While `editeur` is `null`** the route renders "Page introuvable", never an empty block.
- **Footer link, stopgap:** `StorefrontFooter` links the page only when `editeur` is set
  (`mentionsLegales` input, marked `ponytail:`). **Retire it once the live client has provided their
  identity:** make the link unconditional. From then on every published storefront has one, and
  slice 9's gate keeps it so.
- **Prices:** a priced carte reads "Prix indicatifs : seuls les prix affichés au marché font foi."
  Under franchise, the carte and the featured market's menu add `TVA non applicable, art. 293 B du CGI`.
  `vatExempt` on the view model owns the rule.
- **Open:**
  - LCEN 6-III-1 asks the éditeur to give the hébergeur's phone. The Market Miam block has an
    address and email but no phone. Add one, or confirm the email is enough.
  - The éditeur block's layout, the hébergeur lines and the "Prix indicatifs" sentence are not
    lawyer-reviewed text (policy B is).

### 8. Rollout

Deploy 2–9. Neither the footer link nor the route shows anything while `editeur` is `null` (slice 7),
so 6 and 7 no longer wait for the client's identity. Then ask the live client to fill in the form (the
dashboard card asks them too), check their live page, and retire slice 7's footer stopgap.

`main` auto-deploys on green CI (`render.yaml`), so deploying is pushing: 2–4 were pushed on
2026-10-05. 5–9 were committed on 2026-10-13, not pushed.

Push 9 with 6, since 9 is what makes policy A's "Ce qui est obligatoire" true.

### 9. Readiness gate — shipped (`1050047`, `7883f7f`)

- `StorefrontPublication` asks `Vendor.hasCompleteLegalIdentity()`, reason `legal` (ADR 0054's row
  of ADR 0031's table). An identity on record is complete: its value objects checked every field when
  it was recorded. `PublishStorefrontHandler` loads the `Vendor`.
- The live client is unaffected: they were published before the gate, and it only applies when publishing.
- The dev seed registers the demo vendor and gives it a fictional identity (SIRET `12345678900015`,
  Luhn-valid, unknown to Sirene), or the demo storefront would no longer publish.
- **Vendor app:** a fourth setup step, "Vos mentions légales", leads to the form and holds back
  "Publier" until it is done. The dashboard's prompt card from slice 5 now shows on the published
  home only; before publication, the step asks.
- This makes policy A's "Ce qui est obligatoire" true for every publication from here on. The live
  client stays an exception until they fill in the form (Rollout).

## Not in this plan

- Stripe and the 10-year invoice rows in policy A come with Billing (ADR 0048).
- Cloudinary's IP masking is a dashboard switch and can be flipped at any time.
- Deleting the Auth0 user on erasure stays manual.
- A storefront edit by an erased vendor is refused by the tombstone as a 500, not a domain
  error: `Storefront` doesn't know about `VendorErased` (ADR 0058). Only matters until the Auth0
  user is deleted by hand.
