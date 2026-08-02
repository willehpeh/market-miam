# Privacy & RGPD — Status & Remaining Work

Scope: personal data the **product** processes. The marketing site is covered separately
— `docs/WEBSITE-PLAN.md` §3, and `/mentions-legales` deliberately describes only the
Tally lead form. Nothing on that page covers vendor accounts, and it shouldn't.

Already decided, don't re-open: crypto-shredding for erasure (ADR 0025), Auth0 as
identity provider (ADR 0021).

## Personal data actually held today

| Data | Where it lives | Erasure route |
|------|----------------|---------------|
| Vendor email | Auth0; `VendorRegistered` payload (encrypted) | Key shred + Auth0 user delete |
| Storefront `name`, `description`, `phone` | `StorefrontInformationEdited` payload (encrypted); `vendor_storefront_views` (plaintext) | Key shred + projection rebuild |
| Pilot leads (nom, mail, marchés) | Tally only — never enters the event store | Delete the Tally response |

Registry of encrypted fields: `packages/market-days/src/vendor/vendor-pii-fields.ts`.
No customer accounts exist — `customer-storefront/` is a read-side query, not a subject.

## Remaining

### 1. Vendor-facing privacy policy — needed before the first vendor registers

Not a copy of the website one. What actually differs:

| | Website page | Vendor policy |
|---|---|---|
| Subjects | Prospects who filled the form | Registered vendors |
| Legal basis | Intérêt légitime (prospection B2B) | Exécution du contrat |
| Retention | 3 ans après le dernier échange | Durée du compte + délais légaux |
| Sub-processors | Tally, Render | Tally, Render, **Auth0** |

Include one plain-French sentence on irreversibility — *la suppression est définitive,
vos informations deviennent définitivement illisibles, y compris dans les sauvegardes*.
State the consequence, never the algorithm: no "AES", no "clé", no "chiffrement" in
user-facing text. The precise claim belongs in ADR 0025, which is versioned and can be
corrected; a public page can't be, and ADR 0025 already names a case where a blanket
claim would go stale (customer PII landing in vendor streams).

### 2. Registre des traitements (art. 30)

Required. The under-250-employees carve-out in art. 30(5) doesn't apply: it lifts only
for processing that is *occasional*, and running vendor accounts is continuous. One
CNIL-style table, kept as a file, not published. Entries: pilot prospection, vendor
accounts, storefront publication. Each needs finalité, base légale, catégories de
personnes et de données, destinataires, transferts hors UE, durée de conservation, and
the art. 32 security measures — which is where crypto-shredding gets written down.

### 3. Sub-processor register + DPAs

Auth0 (Okta, US), Render (US), Tally (Belgium). Two of three are outside the EU, so each
needs its transfer basis recorded — the same gap `/mentions-legales` now discloses in
prose for Render.

## Open questions

- **The storefront phone is published, by design.** It renders on the public storefront,
  so it's personal data the vendor is deliberately exposing. Say so at the point they
  type it, not only in a policy — a sole trader typing a mobile number should know it
  lands on a public page.
- **Decided (2026-08-02): `description` counts as personal data** — vendors are sole
  traders, so free text about the business is text about the person. The art. 30 entry
  claims it as such; the encryption already matches.
- **Decided (2026-08-02): the address field was dropped** — ADR 0025's context was ahead
  of the implementation (noted there); no address exists in the code or events, and the
  register must not claim one.
