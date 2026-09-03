# 0054. Vendor legal identity: the storefront's mentions légales

Date: 2026-09-03 · Status: Accepted

## Context

LCEN 2004-575 art. 6-III-1 and art. 19 oblige a professional publishing online to
identify themselves. A vendor writes their storefront's name, description, dishes
and prices, so **the vendor is the éditeur** of `chez-mohamed.example.fr`; Market
Miam is the intermediary, and appears only in the hébergeur block. As host we
separately owe art. 6-II — holding vendor identity and releasing it on lawful
request — which today we cannot do: we hold a phone number.

`StorefrontInformationEdited` carries `name`, `description`, `phone`. `name` is
the enseigne, not a legal name. The address was deliberately dropped
(`PRIVACY-PLAN.md`); ADR 0024 froze the registration email as an administrative
snapshot, not a publishable contact. So no storefront can carry a compliant
notice, and `docs/archive/VENDOR_REGISTRATION_AND_PII.md` already names the gap:
"a distinct profile event carrying address/postcode is still future".

A reading of the texts, not advice. The médiateur obligation is worth one
confirmation before it goes to pilot vendors.

## Decision

**The data is Market Days, not Billing.** Three arguments, any one sufficient:

- *Purpose.* Here these facts exist **to be published** — vendor-authored, gating
  publication, the vendor's infraction if wrong. In Billing the same-looking
  facts exist to **invoice a customer**, authored by us, with Stripe as system of
  record (ADR 0048). Same spelling, two facts.
- *Direction.* ADR 0048 forbids `market-days` depending on `billing`. Putting the
  notice in Billing makes rendering a public page depend on the context that
  takes money — and a self-hosted AGPL instance with no Stripe still owes LCEN.
- *Retention.* ADR 0048 keeps invoices (~10 years) outside per-vendor shredding.
  The notice shreds *with* the vendor, because erasure deletes the subdomain row
  → 404 (ADR 0031) and the page stops existing. Opposite lifecycles.

Billing will hold a duplicate billing identity, captured at Stripe Checkout. That
duplication is correct; Billing reading `vendor-{vendorId}` to invoice is not.

**It lives on `Vendor`, not `Storefront`.** `RecordVendorLegalIdentity` →
`VendorLegalIdentityRecorded` on `vendor-{vendorId}`, full-state payload (ADR
0024). It is the identity of the business, stable across whatever the shop window
does; `Storefront` holds presentation. This *supersedes* an earlier working note
placing it on `Storefront`.

**Completeness is a fourth readiness contributor** (ADR 0031's table), reached
the way Catalogue and Calendar already are — no new mechanism:

| Contributor | Query | Reason |
|---|---|---|
| Vendor | `hasCompleteLegalIdentity()` | `legal` |

**Fields asked of every vendor:**

| Field | Basis | Note |
|---|---|---|
| SIRET (14) | identification | four fields derive from it |
| Dénomination légale | LCEN 6-III-1 | the person, not the enseigne |
| Adresse professionnelle | LCEN 6-III-1 | |
| Email de contact public | LCEN art. 19 | **not** the Auth0 one; default it, don't reuse it |
| Téléphone | LCEN art. 19 | reuse `phone` |
| Régime TVA (assujetti / franchise) | | drives the TVA line |
| Médiateur : nom + site | C. conso. R616-1 | see below |

Only if a société: forme juridique, capital social, ville du greffe (RCS),
représentant légal (→ directeur de la publication). For an EI capital does not
exist and the directeur is the vendor; derive both.

**Derived, never typed:** SIREN = SIRET[0..9]; TVA = `FR` + clé + SIREN where clé
= `(12 + 3 × (SIREN mod 97)) mod 97`; dénomination / adresse / forme juridique /
ville du greffe prefilled from `recherche-entreprises.api.gouv.fr` (open data, no
key). Manual fallback for vendors under Sirene non-diffusion, which returns
nothing for them. Onboarding is then: type SIRET → confirm → email, TVA,
médiateur.

**Accessible, never on request.** Art. 19's *accès facile, direct et permanent*:
a dedicated SSR route under the storefront parent, linked from `StorefrontFooter`
— already mounted on both pages — in text, not an image or a PDF.
`RenderMode.Server` on `**` covers it. Art. 6-III-2's anonymity carve-out is for
non-professional éditeurs and does not reach a traiteur.

**No CGV, no rétractation block.** Nothing is sold on the page; a phone order's
information duty lands on the call. Prices stay TTC (L112-1), with `TVA non
applicable, art. 293 B du CGI` beside them under franchise.

**Price display, which ADR 0052 deferred and 0053 reopened.** 0052 closed the
question by quoting nothing on the carte; 0053 puts catalogue prices back there
by default, so it is live again. L112-1 asks that the figure shown be the price
actually charged, TTC. A carte price and a trading market's price can now differ
for one dish on one storefront (ADR 0052's override rule), which is the exposure
— not the carte carrying prices at all. Resolved by wording, not by a gate: the
carte is labelled as indicative and the market's list governs. That labelling is
a publication requirement of this ADR, not a copy preference. **No EU ODR link** —
that platform closed 20 July 2025. No insurance line: traiteur has no mandatory
insurance under L111-2 c. conso. Allergens (INCO 1169/2011) stay a point-of-sale
duty and move onto the page only if a sale is ever concluded there.

## Consequences

- Every field enters `vendorPiiFields`. Its retention basis is *obligation
  légale*, not contrat — the erasure right does not reach it while the page
  lives, and the 404 on erasure is what makes shredding it coherent. Record this
  in the art. 30 register (`PRIVACY-PLAN.md` §2) as its own entry.
- **The médiateur blocks onboarding, not publication.** Most vendors have no
  subscription (~50–100 €/yr; CM2C, Medicys, AME). Surface it at onboarding with
  links; a vendor who finishes catalogue and schedule then hits a paid
  prerequisite abandons.
- A storefront privacy section is now owed too, and cannot yet be written
  honestly: `apps/customer-frontend/src/index.html` loads Google Fonts and a Font
  Awesome kit from CDNs, sending every visitor's IP to third parties — exactly
  what `WEBSITE-PLAN.md` §4 self-hosted the fonts to avoid. Fix that first.
  Cloudinary (US) serves the photos and stays disclosed.
- The hébergeur block is a constant: Market Miam, then Render — as
  `mentions-legales.astro` already reads.
- Art. 6-II is satisfied as a side effect: we hold what a request would ask for.

## Rejected

| Option | Why not |
|---|---|
| The notice on request, or by email | Art. 19 says *facile, direct et permanent*; all three fail |
| Market Miam's own mentions covering the storefronts | We are not the éditeur of vendor content; identifying ourselves does not identify them |
| The fields in Billing | Inverts ADR 0048's seam; a Stripe-less deployment still owes LCEN |
| The fields on `Storefront` | It holds presentation; the legal identity outlives the shop window and is what Billing would later duplicate |
| Making the médiateur optional | Publishing a knowingly incomplete notice |

Builds on ADRs 0009, 0024, 0025, 0031, 0045, 0046, 0048, 0052, 0053.
