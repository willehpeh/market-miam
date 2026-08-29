# CGU / CGV — what a draft needs before it can be written

Scope: the contract between Market Miam and a **traiteur** who subscribes. Not the
marketing site's `/mentions-legales` (LCEN + RGPD art. 13 for the Tally form —
`WEBSITE-PLAN.md` §3, done), and not the AGPL, which covers the code and says so:
*« Cette clause porte sur le code source … Elle ne concerne pas le service Market Miam
souscrit par les traiteurs, qui relève de ses propres conditions générales. »* That
sentence is already published and currently points at nothing.

Personal-data work tracks separately in `PRIVACY-PLAN.md`; the two meet at one seam
(§5 below) and neither should restate the other.

**Not legal advice.** This is a requirements inventory, written from the code and the
plan docs, for a French lawyer to price and review. Everything in §6 in particular is
a question to put to counsel, not an answer.

## 1. Already settled — do not re-ask

| Fact | Source |
|---|---|
| Éditeur: William Alexander, micro-entreprise, 95 av. de Verdun 93230 Romainville, SIREN 794 431 874, TVA FR 08 794 431 874, `contact@marketmiam.fr` | `apps/website/src/pages/mentions-legales.astro` |
| No published phone — deliberate, risk accepted | `WEBSITE-PLAN.md` §3 |
| Price: 15 € HT / mois (18 € TTC), first month free, no engagement, no commission | `apps/website/src/pages/index.astro:6,168` |
| ~~Price freeze: *le tarif ne bouge pas*~~ — **withdrawn, decision 6.** Still published; must come off the site before the CGV ships (§8) | `index.astro:172` |
| Pilot = 5–10 hand-onboarded traiteurs; ends when the cohort fills, no date promised | `WEBSITE-PLAN.md` |
| No billing system — invoiced by hand, non-payment handled by unpublishing by hand | `WEBSITE-PLAN.md` decisions; ADR 0048 |
| Hosting Render (US), identity Auth0 (Okta, US), photos Cloudinary, forms Tally (BE) | `MARKET_MIAM.md`, `PRIVACY-PLAN.md` |
| Erasure is irreversible by design; state the consequence, never the algorithm | ADR 0025, `PRIVACY-PLAN.md` |
| Storefront lives at a subdomain; assignment is a publication requirement | ADRs 0031/0032 |
| No ordering, no payment, no delivery on-platform — customers phone the vendor | `storefront-footer.ts` (*Réservations & commandes : <tel>*) |
| Scope of what actually ships: vitrine, carte, calendrier, menu du jour, épuisé, bilan, repères | `MARKET_MIAM.md` MVP status |
| Trademark: INPI check clear, registration requested 2026-08, **confirmation pending** | `MARKET_MIAM.md` |

## 2. Decisions taken — 2026-08-26

Settled with the owner, one question at a time. These are the draft's premises; a
lawyer may push back on any of them, but none is now a guess.

1. **Eligibility — B2B only, France only, professional activity warranted at signup,
   SIREN collected.** A 14-day droit de rétractation is granted *voluntarily* rather
   than because it is owed: art. L221-3 C. conso reaches professionals with ≤5 employees
   contracting outside their main activity, and a traiteur buying a vitrine is close
   enough to the line that granting the right is cheaper than arguing about it. The first
   month is free anyway, so it costs nothing in practice. Draft it as a granted right,
   not an admission that consumer law applies.
2. **Billing starts at first publication, with a dormancy cap.** The free month runs from
   `StorefrontPublished`; a registered account that never publishes is free and dormant,
   and is closed after **90 days** of inactivity with notice.
3. **Anniversary month, no pro rata, virement, 30 days net.** Billed monthly on the
   publication anniversary; a month begun is a month owed, no refund on mid-month exit.
   Invoice by email, paid by bank transfer. Mandatory French B2B mentions apply and are
   not negotiable: late penalties at 3× the taux d'intérêt légal and the 40 € indemnité
   forfaitaire de recouvrement.
4. **Non-payment ladder.** Due at 30 days → reminder at D+7 → written notice, then the
   vitrine is unpublished at D+15 → account and data kept intact 3 months, then deleted.
   A vendor who pays inside those 3 months gets their vitrine back untouched.
5. **Termination by the vendor: by email to `contact@`, effective at the end of the paid
   month.** No notice period beyond that — *sans engagement* on the landing page is a
   published promise and this keeps it. The subdomain is held 30 days then released for
   reuse, an export is provided on request, and data is erased at 30 days.
6. **No price freeze.** 15 € HT/mois buys what ships today, with no promise about what
   comes later. **Payment and ordering features, when they land, are optional and sit in
   a separate tier at 50 €.** Changes to an existing vendor's price take effect 3 months
   after written notice with a free right to leave, and no increase falls in a vendor's
   first 12 months. This supersedes the published freeze and partly resolves *pricing
   tiers and feature gating*, an Open Item in `MARKET_MIAM.md` — see §8 for what has to
   change on the site first.
7. **Availability: obligation de moyens.** No uptime figure, no service credits. Planned
   maintenance announced in advance where possible. Support by email, best-effort, no
   response-time target. Backups described as taken regularly, with no guaranteed
   recovery point. Nothing here needs tooling that does not exist.
8. **Onboarding assistance is contractual.** Included at no extra cost, covering the
   initial vitrine, carte and calendrier, time-boxed to the first 30 days, obligation de
   moyens. Keeps *« nous mettons votre vitrine en place avec vous »* honest without
   turning it into an unlimited managed service. **Amended by decision 13**: this was to
   live in a pilot annex; with the pilot gone it is a plain term owed to every vendor,
   which is the same promise made to an unbounded number of people — the cap on that is
   decision 13's retained manual onboarding, not a clause.
9. **Marketing use is opt-in, per use, in writing.** No blanket reference licence.
   Consequence for `WEBSITE-PLAN.md`: the §5 dashboard screenshots and the deferred
   client testimonial each need their own permission from the vendor concerned, and that
   permission is per-asset, not per-vendor.
10. **Termination by Market Miam is graded, reasoned and answerable.** Immediate for
    illegal or dangerous content; 15 days' notice to cure any other breach (non-payment
    per decision 4, misuse, false professional status); 30 days for termination without
    fault. Every case carries a written statement of reasons and a right of reply. This
    is deliberately the shape DSA art. 17 and P2B both require, adopted regardless of
    whether either applies — see §6.
11. **Changing the terms: 30 days' notice by email**, continued use is acceptance,
    refusal is a free termination with nothing further owed. Past versions stay
    retrievable at their own URLs so it is provable which version a vendor accepted.
    30 days clears P2B's 15-day floor with margin.
12. **French law, tribunal judiciaire de Bobigny, French text only.** Bobigny is the
    venue for Romainville. The tribunal judiciaire rather than the tribunal de commerce:
    the éditeur is an entrepreneur individuel not registered at the RCS, so naming the
    commercial court invites a competence argument. A prior attempt at amicable
    settlement is named as a first step. No English version to keep in sync.

### Added 2026-08-26, after the pilot and verification questions

13. **The pilot phase is removed. The product is sold as-is, and onboarding stays
    manual — option (a).** No cohort of 5–10, no *phase pilote*, no annex: one uniform
    contract for every vendor. Anyone can buy; you still set them up by hand.
    **Self-serve — option (b) — is deferred, and it is deferred on product gaps, not on
    wording.** Two things block it and neither is legal work:

    - **Subdomain assignment has no code path.** `SubdomainRegistry` exposes
      `vendorFor`, `subdomainFor`, `removeFor` — no claim, no assign. The only
      `INSERT INTO subdomain_registry` in the tree is a container spec. ADR 0032 states
      the consequence plainly: *"a vendor cannot reach 'ready' unaided — an operator
      must seed their `subdomain_registry` row before they can go live"*, and names the
      `SubdomainAssigned` command as *"the natural next step, not a nicety"*. Until it
      ships, every new customer costs one hand-run SQL statement against production.
    - **Payment collection.** Decision 3 — virement, invoice by email, chase by hand —
      was chosen for a cohort of 5–10. Unbounded signups make Stripe the right answer,
      which is the option rejected in that question. A free month with no payment method
      captured is also an open door once nobody is vetting signups personally.

    Under (b), §4's acceptance capture stops being a parallel task and becomes a launch
    blocker: hand-onboarding lets agreement be evidenced in an email thread, self-serve
    leaves the checkbox as the only proof there is.

14. **Vendors are verified — professional status, at signup, level L2.** The SIREN is
    collected and checked against the public business register: the establishment
    exists, it is administratively active, and its NAF code is plausible for the trade
    (56.21Z, 47.81Z, 56.10C, 10.13B and neighbours). Automatic, free, no document upload
    and no review queue. Rejected: checksum-only (catches typos, nothing else) and
    document review (Kbis and ID, i.e. storing identity documents for a 15 €/month
    product).

    - **Never called KYC**, in the terms or in the code. KYC is an AML/CFT term of art
      attaching to financial institutions and payment service providers under the Code
      monétaire et financier; Market Miam is neither and handles no funds. The word
      imports obligations that do not apply and cannot be met. It is
      *vérification du statut professionnel*. Actual KYC arrives only with the ordering
      tier, as **Stripe's** obligation on a connected account — ADR 0048 already places
      connected-account/KYC onboarding in Ordering and explicitly off `Vendor`.
    - **It is a gate on publication, never a badge on the vitrine.** Verification
      establishes that a registered business exists. It says nothing about hygiene,
      agrément sanitaire, carte de commerçant ambulant or market authorisations, all of
      which stay vendor warranties in the CGU. A *« Vérifié par Market Miam »* mark
      would imply the food was vetted — a liability volunteered for nothing.
    - **It hardens decision 1.** B2B-only currently rests on an unchecked
      self-declaration; L2 turns the warranty into a check, which is what keeps consumer
      law out in fact rather than in argument.
    - **Where it lands.** `StorefrontPublication.publish()` already composes readiness
      as boolean clauses — `hasTitle`, `hasCoverPhoto`, `hasAtLeastOneItem`,
      `hasAtLeastOneSchedule`, `hasSubdomain`. Verification is one more of the same
      shape, which is also how ADR 0048 describes the entitlement seam landing. An
      unverified vendor builds their carte and calendrier and simply cannot publish.
      Expect a distinct `VendorProfessionalStatusVerified` event rather than a
      `VendorRegistered` v2: verification happens after registration and can be re-run
      (ADR 0009).
    - **It reverses a recorded privacy decision.** `PRIVACY-PLAN.md` records that the
      address field was dropped and that the art. 30 register must not claim one. A
      register lookup returns the establishment address, and §4's vitrine mentions
      légales want it independently. Storing only the SIREN and a verified-at timestamp
      is the minimal version but does not serve the mentions-légales half. Either way:
      a new row in the privacy table, a new entry in
      `packages/market-days/src/vendor/vendor-pii-fields.ts`, and ADR 0025 shredding
      applying to whatever is kept.

## 3. Facts to confirm outside the repo

- **Trademark registration outcome.** Pending since 2026-08. The IP clause's strength
  depends on whether the mark is registered or merely filed.
- **Sub-processor legal identities and transfer bases** — Auth0/Okta, Render, Cloudinary,
  Tally. `PRIVACY-PLAN.md` §3 already owes this; the CGU's sub-processor annex needs the
  same list. Render's coordinates in `mentions-legales.astro` came from an AI summary
  and are still unconfirmed against render.com.
- **Cloudinary is entirely undocumented on the legal side.** It appears in
  `MARKET_MIAM.md` and in `apps/api/src/app/signed-uploads/`, and nowhere in
  `PRIVACY-PLAN.md`'s sub-processor list. Add it there too.
- **Which business-register API, and on what terms.** INSEE's Sirene API and the
  DINUM *recherche d'entreprises* API both serve decision 14's L2 check; one needs a
  free key and one does not, and their rate limits and reuse terms differ. Confirm
  before building — this is past what the plan doc can assert from memory.
- **Insurance (RC professionnelle).** Whether one exists decides whether the liability
  cap can be stated as a multiple of fees paid or must be bare.
- **B2B e-invoicing timetable.** The French reform obliges every VAT-registered business
  to *receive* structured e-invoices via a PDP, with issuing phased later for TPE/PME.
  The dates have moved before and are past this document's knowledge horizon — confirm
  the current schedule, because it lands on §2.3's invoicing clause and on a micro
  -entreprise invoicing by hand.

## 4. Product and code gaps the CGU would assert

These are things the contract will claim that the product does not currently do. Each
is a small piece of work, not a wording choice.

| Gap | What the CGU needs | Where it lands |
|---|---|---|
| **No acceptance is captured anywhere.** Registration goes Auth0 → `VendorRegistered`; no checkbox, no stored version, no timestamp. There is no proof any vendor agreed to anything | Acceptance recorded with the version accepted and when | A checkbox in the registration flow + either `VendorRegistered` v2 or a `TermsAccepted` event (ADR 0014 for payload shape; not PII, so no encryption) |
| **No version history.** A CGU that changes needs its past versions retrievable to prove what a given vendor accepted | Versioned, dated, archived pages | `apps/website` route per version, or a `/cgu/2026-09` scheme |
| **No vendor mentions légales on the vitrine.** Each storefront is a public commercial page; LCEN art. 6-III wants the vendor identified — name, address, SIREN, contact. The storefront holds name, description, phone and nothing else; **no SIREN field exists in the domain at all** | Either the vitrine carries the vendor's legal identity, or the CGU makes the vendor responsible for it and gives them somewhere to put it | New storefront fields + `StorefrontInformationEdited` v2; PII register in `vendor-pii-fields.ts` must follow. **Shares a field with decision 14** — verification collects the SIREN anyway, so build the two together |
| **No professional-status verification** (decision 14). Nothing checks that a vendor is a real, active, food-trade business | The CGU asserts B2B-only eligibility and makes verification a condition of publication | Register lookup at signup, a `VendorProfessionalStatusVerified` event, one more clause in `StorefrontPublication` |
| **No export.** RGPD portability and §2.5's exit clause both assume one; there is no export endpoint, and the ops transport for `erase`/`rebuild` is still deferred (`NEXT_BEHAVIOURS.md`) | A stated route and a deadline (one month) | Manual for the pilot, stated as such |
| **No takedown or notice mechanism.** DSA art. 16 wants a notice-and-action route; art. 17 wants a statement of reasons when content is removed | A contact point and a described procedure | An email route is enough at this size, but it has to exist and be named |
| **No suspension mechanic.** Non-payment and abuse both end in *unpublish by hand* with nothing recorded | Grounds, notice, effect on data | Manual for now; ADR 0048's entitlement seam is the eventual home |
| **Prices are bare cents, no HT/TTC and no currency.** `packages/market-days/src/calendar/pricing/` stores whole cents; the vitrine shows them to consumers | The CGU should put price-display compliance (TTC, affichage) squarely on the vendor | Wording only, unless a TTC/HT flag is ever added |

## 5. The seam with `PRIVACY-PLAN.md`

The privacy plan owes three things that the CGU must reference and must not duplicate:
the vendor-facing privacy policy, the registre art. 30, and the DPAs. Two additions
belong to this document rather than that one:

- **Controller roles.** Today Market Miam is controller of the only personal data held
  (the vendor's own — vendors are sole traders, so `description` counts, decided
  2026-08-02). There is no customer personal data, because there are no customer
  accounts. **This flips the day `ItemMiamed` or `ItemRequested` ships**: customer
  signals would make Market Miam a processor acting for the vendor, which needs an
  art. 28 DPA annexed to the CGU. Decide now whether to annex a dormant one or to
  gate it on that feature.
- **Retention conflict, already named.** ADR 0048 flags it: invoices carry a ~10-year
  retention obligation while ADR 0025 erases by key deletion. The CGU's retention
  clause and Billing's design have to give the same answer, and the CGU will be written
  first.

## 6. Regulatory questions for counsel

- **DSA (Reg. 2022/2065).** Hosting vendor-published content makes Market Miam an
  intermediary; storefronts are public, which points at the *online platform* tier.
  Art. 19 exempts micro and small enterprises from the Section 3 obligations, which
  removes most of the weight — but **art. 14 applies regardless**: the terms must
  describe content restrictions and the moderation policy in plain language. That is a
  drafting requirement, not an option.
- **P2B (Reg. 2019/1150).** The genuine judgement call. It catches *online intermediation
  services* that let business users offer goods to consumers *with a view to facilitating
  the initiating of direct transactions* — irrespective of where the transaction is
  concluded. Market Miam takes no orders and no payment, but the vitrine footer reads
  *Réservations & commandes : <téléphone>*, which is initiation by any plain reading.
  Small-enterprise exemptions would lift the internal complaint-handling and mediator
  obligations even if it applies, leaving T&C transparency, a 15-day notice floor on
  changes, and statements of reasons on suspension. **Decisions 10 and 11 adopt that
  standard**, so the question no longer blocks the draft — 30 days' notice clears the
  15-day floor and every suspension carries reasons and a right of reply. Counsel still
  needs to answer it for the record, because the answer flips outright when the 50 €
  ordering tier ships (decision 6): at that point transactions run through the platform
  and P2B applies on any reading.
- **Contrat conclu par voie électronique** (art. 1127-1 et s. C. civ.) — the double-clic
  and the steps/languages/archiving statements. Derogable between professionals; say so
  explicitly rather than relying on it.
- **Statut d'hébergeur vs éditeur.** Market Miam is éditeur of `marketmiam.fr` and host
  of the vitrines. Worth stating, because it is the basis of the liability split with
  the vendor's own content.

## 7. Shape of the deliverable

One document or two? *CGU* (using the service: account, content rules, moderation,
liability, IP) and *CGV* (price, invoicing, term, termination) address the same signer
and French practice routinely merges them as **CGU/CGV**. One page, two parts, one
version number. **No annex** — decision 13 removed the pilot, so there is no cohort with
terms of its own and every vendor signs the same text. That is a real simplification:
one document to version, one URL to archive, no risk of the annex and the main text
drifting.

Publication: a `/cgu` route in `apps/website`, footer link beside *Mentions légales*,
and the same URL linked from the registration checkbox. The vendor app should link it
too — a vendor meets the terms where they sign, not only where they were sold.

**Shipped 2026-08-29 as a draft.** `apps/website/src/pages/cgu.astro` holds the full text,
27 articles, one document with the commercial half opening at article 16 over a rule
rather than a second `<h1>`.

The page is **deliberately not published**. `VERSION.date` is `null`, which does three
things: a *Projet* banner says the text binds nobody, `noindex` keeps it out of search,
and it is linked from no footer. Setting the date is the gesture that publishes — and it
travels with two other edits, named in the file's header comment: add the footer links
(site and vendor app), and drop `/cgu` from the sitemap filter.

Two mechanics worth knowing, both found by building rather than reading:

- **`<meta slot="head">` in a page is silently dropped.** `Base.astro` has only a default
  `<slot />`, so a page-level robots tag renders nowhere while looking exactly like a
  working noindex — the same class of trap as the `set:html` scoping one already recorded
  in `WEBSITE-PLAN.md`. `Base.astro` now takes a `noindex` prop instead.
- **Archived versions must never reach the sitemap.** `sitemap()` took no filter, so every
  frozen `/cgu/2026-09` would have been submitted for indexing to compete with the version
  in force. The filter in `astro.config.mjs` excludes the whole `/cgu` subtree; the archive
  half of that rule is permanent, the `/cgu` half comes off at publication.

Still open in the text itself, for counsel: the liability cap (article 26) is expressed as
the sums paid over twelve months, which wants checking against art. 1170 C. civ. and
art. L442-1 C. com.; and article 13's closing paragraph defers the art. 28 processing terms
to a later amendment rather than annexing a dormant DPA, which is the §5 question answered
by deferral rather than by decision.

## 8. Site copy that must change before the CGV ships

Decisions 6 and 13 both contradict what is currently published. The CGV cannot go up
while the landing page promises otherwise — a contract that disagrees with the sales
page is worse than no contract. Decision 13 is the larger edit of the two: the pilot is
not a section of the page, it is the page's stated purpose (`WEBSITE-PLAN.md`:
*"convert vendors into the pilot — 5–10 hand-onboarded traiteurs, not self-serve
signup"*), so removing it touches the CTAs, the closing band and the form it opens.

| What | Where | Why |
|---|---|---|
| ✅ *« Le tarif ne bouge pas — ce qui arrive ensuite est compris, sans supplément. »* | `apps/website/src/pages/index.astro:172` | **Done 2026-08-29.** Withdrawn. Replace with the price-change rule from decision 6, which carries its own reassurance: 3 months' notice, free exit, no increase in the first year |
| Decision entry *"The price freeze ships with the price"* | `WEBSITE-PLAN.md` | Superseded — record it as such rather than deleting, per that doc's own convention |
| Deferred entry *"A 50 € tier (préco + réservation) — deliberately not on the page"* | `WEBSITE-PLAN.md` | Partly superseded: the tier is now a decided direction. Whether it goes *on the page* is still a separate call, and the reasoning there — a pricing table at the moment you ask for trust — still stands |
| Open Item *"Pricing tiers and feature gating"* | `MARKET_MIAM.md` | Partly resolved: two tiers, gated on payment/ordering. What sits in each beyond that is still open |
| *« Premier mois offert. Sans engagement. »* | `index.astro:93,168` | Unchanged and still accurate — decisions 2 and 5 were chosen to keep it true |
| *« Rejoindre le pilote »* (header) · *« Rejoignez les premiers traiteurs »* (both in-page CTAs) | `index.astro:78,92,179` | Decision 13. The CTAs currently sell joining a cohort. The recorded rule that in-page CTAs match the Tally form's title still holds — so the form title moves with them, or the form goes |
| *« La phase pilote »* / *« Nous accompagnons cinq à dix traiteurs, personnellement. »* and the four terms below it | `index.astro:160–176` | Decision 13. Three of the four terms survive unchanged (premier mois offert, aucune commission, vos clients restent vos clients); the band's framing and its heading do not. The personal-onboarding promise stays true — decision 8 keeps it — but it is no longer scarce |
| Page purpose, CTA rule, and the decisions defining the pilot as a hand-onboarded cohort | `WEBSITE-PLAN.md` | Decision 13. Record as superseded, per that doc's convention; the *why* is worth keeping, since option (b) would revive most of it |
| Tally lead capture as the conversion path | `index.astro`, form `aQX9NB` | Decision 13 keeps onboarding manual, so a lead form still fits — but its title and its consent copy both name the pilot (`WEBSITE-PLAN.md` §2). Changing that copy is Art. 13 information, so it moves with the form, not after it |

## Where this stands

**The draft is written** (§7). What remains, in the order it blocks publication:

1. **Legal review.** The text is built from §2's fourteen decisions and §6's regulatory
   reading; neither has been seen by a lawyer. The two clauses flagged in §7 are the ones
   to point at first.
2. **§8's site copy** — the pilot removal shipped 2026-08-29, along with the price-freeze
   line and the two pilot references in `/mentions-legales`. What is left is outside the
   repo: the Tally form's title and its consent copy both still name the pilot, and the
   consent copy is Art. 13 information rather than marketing text.
3. **§4's code.** Acceptance capture is the one that matters — until it exists, no
   vendor's agreement to a version is provable, and the text at article 4 promises it is.
   The SIREN field now has two callers (§4, decision 14), so it gets built once.
4. **§3's confirmations** change what the text claims, not whether it stands.

Publication is the three-part gesture in §7, not a date change alone.
