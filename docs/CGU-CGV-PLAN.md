# CGU / CGV — what a draft needs before it can be written

Scope: the contract between Market Miam and a **traiteur** who subscribes. Not the
marketing site's `/mentions-legales` (LCEN + RGPD art. 13 for the Tally form,
`WEBSITE-PLAN.md` §3, done), and not the AGPL, which covers the code and says so: its
published clause states that the service *« relève de ses propres conditions générales »*,
and currently points at nothing. Personal-data work tracks in `PRIVACY-PLAN.md`; the two
meet at one seam (§5).

**Not legal advice.** A requirements inventory, written from the code and the plan docs,
for a French lawyer to price and review. Everything in §6 is a question for counsel.

**Refreshed 2026-10-24.** Since August: ordering was decided (`ORDERING-PLAN.md`) and is
part of the only package, at 50 € HT a month; the 4 October holding page replaced the
homepage §8 was editing; the vendor's legal identity shipped (`MENTIONS-LEGALES-PLAN.md`);
and the draft moved to the ordering site as annexe 6 of the lawyer brief (§7).

## 1. Already settled — do not re-ask

| Fact | Source |
|---|---|
| Éditeur: William Alexander, micro-entreprise, 95 av. de Verdun 93230 Romainville, SIREN 794 431 874, TVA FR 08 794 431 874, `contact@marketmiam.fr` | `apps/website/src/pages/mentions-legales.astro` |
| No published phone; risk accepted | `WEBSITE-PLAN.md` §3 |
| Price: 50 € HT / mois (60 € TTC), one package, ordering included (2026-10-24; was 15 € HT / 18 € TTC); first month free, no engagement, no commission | `MARKET_MIAM.md`, `ORDERING-PLAN.md` |
| Price freeze (*le tarif ne bouge pas*) withdrawn, decision 6; off the site since the 4 October holding page, which names no price | `WEBSITE-PLAN.md` |
| Pilot of 5–10 hand-onboarded traiteurs removed, decision 13 | `WEBSITE-PLAN.md` |
| No billing system: invoiced by hand, non-payment handled by unpublishing by hand | `WEBSITE-PLAN.md` decisions; ADR 0048 |
| Hosting Render (US), identity Auth0 (Okta, US), photos Cloudinary, forms Tally (BE) | `MARKET_MIAM.md`, `PRIVACY-PLAN.md` |
| Erasure is irreversible by design; state the consequence, never the algorithm | ADR 0025, `PRIVACY-PLAN.md` |
| Storefront lives at a subdomain; assignment is a publication requirement | ADRs 0031/0032 |
| Ordering decided 2026-10-04, paid online through each vendor's Stripe account, in the only package (was: no ordering, no payment on-platform). Still no delivery | `ORDERING-PLAN.md`, `docs/ordering-board/` |
| What ships: vitrine, carte, calendrier, menu du jour, épuisé, bilan, repères | `MARKET_MIAM.md` MVP status |
| Trademark: INPI check clear, registration requested 2026-08, confirmation pending | `MARKET_MIAM.md` |

## 2. Decisions taken — 2026-08-26

Settled with the owner; a lawyer may push back on any of them.

1. **Eligibility: B2B only, France only, professional activity warranted at signup, SIREN
   collected.** A 14-day droit de rétractation is granted voluntarily, as a granted right
   rather than an admission that consumer law applies, because art. L221-3 C. conso.
   reaches professionals with ≤5 employees contracting outside their main activity.
2. **Billing starts at first publication, with a dormancy cap.** The free month runs from
   `StorefrontPublished`; an account that never publishes is free and dormant, and is
   closed after 90 days of inactivity with notice.
3. **Anniversary month, no pro rata, virement, 30 days net.** A month begun is a month
   owed, no refund on mid-month exit; invoice by email, paid by bank transfer. Mandatory
   French B2B mentions apply: late penalties at 3× the taux d'intérêt légal and the 40 €
   indemnité forfaitaire de recouvrement.
4. **Non-payment ladder.** Due at 30 days, reminder at D+7, written notice, vitrine
   unpublished at D+15, account and data kept intact 3 months, then deleted. Paying inside
   those 3 months restores the vitrine untouched.
5. **Termination by the vendor: by email to `contact@`, effective at the end of the paid
   month.** No further notice period, which keeps the published *sans engagement* promise.
   Subdomain held 30 days then released; export on request; data erased at 30 days.
6. **No price freeze, one package.** The price buys what ships today. A price change takes
   effect 3 months after written notice with a free right to leave; no increase in a
   vendor's first 12 months. Superseded in part 2026-10-24: the separate 50 € tier for
   payment and ordering is gone; one package at 50 € HT a month (60 € TTC), ordering
   included, 15 € dropped. Confirmed the same day: no freeze, the 3-month and first-year
   rules, the free first month (decision 2), and Stripe's fees on a vendor's payments are
   the vendor's. Draft articles 16 and 20 carry it. Resolves *pricing tiers and feature
   gating* in `MARKET_MIAM.md`.
7. **Availability: obligation de moyens.** No uptime figure, no service credits; planned
   maintenance announced in advance where possible; support by email, best-effort, no
   response-time target; backups taken regularly, no guaranteed recovery point.
8. **Onboarding assistance is contractual.** Included at no extra cost, covering the
   initial vitrine, carte and calendrier, time-boxed to the first 30 days, obligation de
   moyens, which keeps *« nous mettons votre vitrine en place avec vous »* true. Amended by
   decision 13: no pilot annex, so a plain term owed to every vendor, capped by manual
   onboarding rather than by a clause.
9. **Marketing use is opt-in, per use, in writing.** No blanket reference licence; the
   `WEBSITE-PLAN.md` §5 dashboard screenshots and the deferred client testimonial each
   need the vendor's permission, per asset.
10. **Termination by Market Miam is graded, reasoned and answerable.** Immediate for
    illegal or dangerous content; 15 days' notice to cure any other breach (non-payment
    per decision 4, misuse, false professional status); 30 days without fault. Every case
    carries a written statement of reasons and a right of reply, the shape DSA art. 17 and
    P2B both require, adopted whether or not either applies (§6).
11. **Changing the terms: 30 days' notice by email.** Continued use is acceptance; refusal
    is a free termination with nothing further owed. Past versions stay retrievable at
    their own URLs so the version a vendor accepted is provable. 30 days clears P2B's
    15-day floor.
12. **French law, tribunal judiciaire de Bobigny, French text only.** Bobigny is the venue
    for Romainville; the tribunal judiciaire because the éditeur is an entrepreneur
    individuel not registered at the RCS, so naming the tribunal de commerce invites a
    competence argument. A prior attempt at amicable settlement is a named first step.

### Added 2026-08-26, after the pilot and verification questions

13. **The pilot phase is removed; the product is sold as-is and onboarding stays manual
    (option a).** No cohort of 5–10, no *phase pilote*, no annex: one uniform contract for
    every vendor. Self-serve (option b) is deferred on two product gaps, neither legal
    work: subdomain assignment has no code path (ADR 0032: an operator must seed the
    `subdomain_registry` row by hand; `SubdomainAssigned` is the next step), and payment
    collection (decision 3's virement was chosen for a cohort of 5–10; unbounded signups
    make Stripe the right answer, and a free month with no payment method captured is an
    open door once nobody vets signups). Under (b), §4's acceptance capture becomes a
    launch blocker, the checkbox being the only proof of agreement.

14. **Vendors are verified: professional status, at signup, level L2.** The SIREN is
    checked against the public business register: the establishment exists, is
    administratively active, and its NAF code is plausible for the trade (56.21Z, 47.81Z,
    56.10C, 10.13B and neighbours). Automatic, free, no document upload, no review queue.
    Rejected: checksum-only, and document review (storing Kbis and ID).

    - **Never called KYC**, in the terms or in the code: KYC is an AML/CFT term of art for
      financial institutions and payment service providers under the Code monétaire et
      financier, and Market Miam is neither and handles no funds. It is *vérification du
      statut professionnel*. Actual KYC arrives with ordering as **Stripe's** obligation on
      a connected account (ADR 0048 places it in Ordering, off `Vendor`).
    - **A gate on publication, never a badge on the vitrine.** Hygiene, agrément
      sanitaire, carte de commerçant ambulant and market authorisations stay vendor
      warranties; a *« Vérifié par Market Miam »* mark would imply the food was vetted.
    - **It hardens decision 1**: L2 turns the B2B self-declaration into a check.
    - **Where it lands.** One more readiness clause in `StorefrontPublication.publish()`
      beside `hasSubdomain` and the others; an unverified vendor cannot publish. Expect a
      distinct `VendorProfessionalStatusVerified` event rather than a `VendorRegistered`
      v2, since verification follows registration and can be re-run (ADR 0009).
    - **Status 2026-10-24.** The SIRET is collected, checksum-checked, and the legal
      identity prefilled from *recherche d'entreprises* (`MENTIONS-LEGALES-PLAN.md`
      slice 5); a complete legal identity is a publication requirement (slice 9). The
      register check itself (active establishment, plausible NAF code) is not built, so
      draft article 5 promises more than ships.
    - **Privacy.** `PRIVACY-PLAN.md` had dropped the address field, and a register lookup
      returns one. Settled 2026-10-24 by ADR 0054, which brought the address back inside
      the legal identity under its own key (ADR 0056); whatever is kept goes in
      `packages/market-days/src/vendor/vendor-pii-fields.ts` and under ADR 0025 shredding.

## 3. Facts to confirm outside the repo

- **Trademark registration outcome.** Pending since 2026-08. Registered or merely filed
  decides the IP clause's strength.
- **Sub-processor legal identities and transfer bases**: Auth0/Okta, Render, Cloudinary,
  Tally. `PRIVACY-PLAN.md` §3 owes the list; the CGU's sub-processor annex needs the same
  one. Render's coordinates in `mentions-legales.astro` are unconfirmed against render.com.
- **Cloudinary is undocumented on the legal side.** It appears in `MARKET_MIAM.md` and
  `apps/api/src/app/signed-uploads/`, not in `PRIVACY-PLAN.md`'s sub-processor list.
- **Which business-register API, and on what terms.** INSEE's Sirene API and the DINUM
  *recherche d'entreprises* API both serve decision 14; one needs a free key, and their
  rate limits and reuse terms differ. Confirm before building.
- **Insurance (RC professionnelle).** Whether one exists decides whether the liability cap
  can be a multiple of fees paid or must be bare. Question B4 of the brief asks counsel
  whether one is required.
- **B2B e-invoicing timetable.** The French reform obliges every VAT-registered business
  to *receive* structured e-invoices via a PDP, with issuing phased later for TPE/PME. The
  dates have moved before; confirm the current schedule, which lands on decision 3's
  invoicing clause.

## 4. Product and code gaps the CGU would assert

Things the contract will claim that the product does not do; each is a small piece of
work.

| Gap | What the CGU needs | Where it lands |
|---|---|---|
| **No acceptance is captured.** Registration goes Auth0 → `VendorRegistered`; no checkbox, version or timestamp | Acceptance recorded with the version accepted and when | Registration checkbox + `VendorRegistered` v2 or a `TermsAccepted` event (ADR 0014 for payload shape; not PII, so no encryption) |
| **No version history** | Versioned, dated, archived pages | `apps/website` route per version, or a `/cgu/2026-09` scheme |
| **Vendor mentions légales on the vitrine: done** (`MENTIONS-LEGALES-PLAN.md`, ADR 0054). LCEN art. 6-III wants the vendor identified (name, address, SIREN, contact) on each public commercial page | The vitrine carries the vendor's legal identity | Storefront fields + `StorefrontInformationEdited` v2, built with decision 14's SIREN collection; `vendor-pii-fields.ts` follows |
| **No professional-status verification** (decision 14), partly built | Verification as a condition of publication | Register lookup at signup, a `VendorProfessionalStatusVerified` event, one more `StorefrontPublication` clause |
| **No export.** RGPD portability and decision 5 assume one; no endpoint, and the ops transport for `erase`/`rebuild` is deferred (`NEXT_BEHAVIOURS.md`) | A stated route and a deadline (one month) | Manual for the pilot, stated as such |
| **No takedown or notice mechanism.** DSA art. 16 wants a notice-and-action route; art. 17 a statement of reasons on removal | A contact point and a described procedure | An email route, named |
| **No suspension mechanic.** Non-payment and abuse end in unpublish by hand, nothing recorded | Grounds, notice, effect on data | Manual for now; ADR 0048's entitlement seam eventually |
| **Prices are bare cents, no HT/TTC, no currency** (`packages/market-days/src/calendar/pricing/`), shown to consumers | Price-display compliance (TTC, affichage) placed on the vendor | Wording only, unless a TTC/HT flag is added |

## 5. The seam with `PRIVACY-PLAN.md`

The privacy plan owes the vendor-facing privacy policy, the registre art. 30 and the DPAs;
the CGU references them. Two points belong here:

- **Controller roles.** Market Miam is controller of the only personal data held, the
  vendor's own (vendors are sole traders, so `description` counts, decided 2026-08-02);
  there is no customer personal data because there are no customer accounts. That flips
  when `ItemMiamed` or `ItemRequested` ships, and *2026-10-24:* ordering flips it first
  (customer emails and orders): Market Miam becomes a processor for the vendor, which
  needs an art. 28 DPA annexed to the CGU. Dormant annex or gated on the feature is
  question C1 of the brief.
- **Retention conflict.** ADR 0048 flags it: invoices carry a ~10-year retention
  obligation while ADR 0025 erases by key deletion. The CGU's retention clause and
  Billing's design must give the same answer, and the CGU is written first.

## 6. Regulatory questions for counsel

- **DSA (Reg. 2022/2065).** Hosting public vendor storefronts makes Market Miam an
  intermediary at the *online platform* tier; art. 19 exempts micro and small enterprises
  from the Section 3 obligations, but art. 14 applies regardless: the terms must describe
  content restrictions and the moderation policy in plain language. Question B2 of the
  brief.
- **P2B (Reg. 2019/1150).** It catches services that let business users offer goods to
  consumers *with a view to facilitating the initiating of direct transactions*, wherever
  concluded; the vitrine footer's *Réservations & commandes : <téléphone>* is initiation,
  and with ordering in the only package P2B applies on any reading, for every vendor.
  Small-enterprise exemptions would leave T&C transparency, a 15-day notice floor on
  changes and statements of reasons on suspension, which decisions 10 and 11 already
  adopt. Question B1 of the brief.
- **Contrat conclu par voie électronique** (art. 1127-1 et s. C. civ.): the double-clic
  and the steps/languages/archiving statements are derogable between professionals; say so
  explicitly. Not in the brief.
- **Statut d'hébergeur vs éditeur.** Market Miam is éditeur of `marketmiam.fr` and host of
  the vitrines; stating it grounds the liability split with the vendor's own content. Not
  in the brief.

## 7. Shape of the deliverable

- **One document, CGU/CGV.** CGU (account, content rules, moderation, liability, IP) and
  CGV (price, invoicing, term, termination) address the same signer and French practice
  merges them. One page, two parts, one version number.
- **No annex.** Decision 13 removed the pilot, so every vendor signs the same text.
- **Publication:** a `/cgu` route in `apps/website`, a footer link beside *Mentions
  légales*, the same URL from the registration checkbox, and a link from the vendor app.
- **Draft shipped 2026-08-29** at `apps/website/src/pages/cgu.astro`: 27 articles, the
  commercial half opening at article 16. Not published: `VERSION.date` was `null`, so a
  *Projet* banner said the text binds nobody, `noindex` kept it out of search, and no
  footer linked it. Setting the date publishes, together with two edits named in the
  file's header comment: the footer links (site and vendor app) and dropping `/cgu` from
  the sitemap filter.
- **Moved 2026-10-24 to `docs/ordering-board/conditions-traiteurs.html`**, annexe 6 of
  the lawyer brief, because a page on `marketmiam.fr`, even unlinked and `noindex`, reads
  as Market Miam's terms, and the draft predates ordering. The page keeps the text, updates
  articles 6, 13, 16 and 20 for the price and the publication requirements, and marks what
  ordering makes false (articles 2 and 13, and a missing article on ordering) *À réécrire*.
  The publication mechanism (the `/cgu` route and its `VERSION.date` gesture, `Base.astro`'s
  `noindex` prop, the sitemap filter for archived versions) is in commit `5d68d55`, to
  restore when the terms are published.
- **Two mechanics behind that build.** `Base.astro` silently drops a page-level
  `<meta slot="head">`, so it takes a `noindex` prop instead; and the sitemap filter in
  `astro.config.mjs` excludes the `/cgu` subtree so archived versions never compete with
  the version in force (the archive half is permanent, the `/cgu` half comes off at
  publication).
- **Still open in the text, for counsel:** the liability cap (article 26), expressed as
  the sums paid over twelve months, against art. 1170 C. civ. and art. L442-1 C. com.; and
  article 13's closing paragraph, which defers the art. 28 processing terms to a later
  amendment rather than annexing a dormant DPA (the §5 question, answered by deferral).

## 8. Site copy that must change before the CGV ships

**Overtaken 2026-10-04 by the holding page**, which carries only the hero, a line naming
online ordering as coming, the Tally button and the footer: no price, no pilot, no freeze.
The table is kept as history. `/mentions-legales` stopped naming the *phase pilote* as the
Tally form's purpose on 2026-10-24 (`WEBSITE-PLAN.md` §3); the form's own consent copy is
still unchecked (§2). What remains is the price: the page states 50 € HT when it is
rebuilt around ordering (`ORDERING-PLAN.md`, step 8). The CGV cannot go up while the
landing page promises otherwise.

| What | Where | Status / why |
|---|---|---|
| *« Le tarif ne bouge pas — ce qui arrive ensuite est compris, sans supplément. »* | `apps/website/src/pages/index.astro:172` | **Done 2026-08-29.** Withdrawn; replaced with decision 6's price-change rule (3 months' notice, free exit, no increase in the first year) |
| Decision entry *"The price freeze ships with the price"* | `WEBSITE-PLAN.md` | Superseded; record it as such, per that doc's convention |
| Deferred entry *"A 50 € tier (préco + réservation) — deliberately not on the page"* | `WEBSITE-PLAN.md` | Superseded 2026-10-24: no tier, one package at 50 € HT a month, ordering included (`ORDERING-PLAN.md`) |
| Open Item *"Pricing tiers and feature gating"* | `MARKET_MIAM.md` | Resolved 2026-10-24: one package, nothing to gate |
| *« Premier mois offert. Sans engagement. »* | `index.astro:93,168` | Unchanged and still accurate; decisions 2 and 5 keep it true |
| *« Rejoindre le pilote »* (header) · *« Rejoignez les premiers traiteurs »* (both in-page CTAs) | `index.astro:20,39` | **Done 2026-10-25.** Every CTA reads *Ouvrons votre vitrine*, the form's title (decision 13; in-page CTAs still match the Tally form's title) |
| *« La phase pilote »* / *« Nous accompagnons cinq à dix traiteurs, personnellement. »* and the four terms below it | `index.astro:160–176` | Decision 13. Three terms survive (premier mois offert, aucune commission, vos clients restent vos clients); the band's framing and heading do not; personal onboarding stays true (decision 8) but is no longer scarce |
| Page purpose, CTA rule, and the decisions defining the pilot as a hand-onboarded cohort | `WEBSITE-PLAN.md` | Decision 13. Record as superseded, keeping the *why*, since option (b) would revive most of it |
| Tally lead capture as the conversion path | `index.astro`, form `aQX9NB` | Open. A lead form still fits manual onboarding, but its consent copy names the pilot (`WEBSITE-PLAN.md` §2); changing it is art. 13 information, so it moves with the form |

## Where this stands

*Refreshed 2026-10-24.* **The draft is written and attached to the lawyer brief** (§7),
moved there 2026-10-24 as annexe 6. The price is 50 € HT with ordering included (decided
2026-10-24); the site's CTAs changed 2026-10-25 (§8). What remains, in the order it blocks
publication:

1. **Legal review**, through the brief: B1 for these terms, A1 to A4 and C1 for the
   ordering clauses that articles 2 and 13 and a new article wait on, and article 26's
   liability cap.
2. **The ordering clauses**, drafted from the lawyer's answers.
3. **§4's code.** Acceptance capture first: until it exists, no vendor's agreement to a
   version is provable, and article 4 promises it is. Decision 14's register check second.
4. **§3's confirmations**, which change what the text claims rather than whether it stands.
5. **The site:** the price, with the rebuild around ordering.

Publication restores the mechanism from `5d68d55` and is the three-part gesture in §7, not
a date change alone.
