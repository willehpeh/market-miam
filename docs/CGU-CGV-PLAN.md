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
   and is closed after **90 days** of inactivity with notice. *(Cap length assumed at 90
   days — the only number in this list not explicitly confirmed.)*
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
8. **Onboarding assistance is contractual, in the pilot annex.** Included at no extra
   cost, covering the initial vitrine, carte and calendrier, time-boxed to the first 30
   days, obligation de moyens. Keeps *« nous mettons votre vitrine en place avec vous »*
   honest without turning it into an unlimited managed service.
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
| **No vendor mentions légales on the vitrine.** Each storefront is a public commercial page; LCEN art. 6-III wants the vendor identified — name, address, SIREN, contact. The storefront holds name, description, phone and nothing else; **no SIREN field exists in the domain at all** | Either the vitrine carries the vendor's legal identity, or the CGU makes the vendor responsible for it and gives them somewhere to put it | New storefront fields + `StorefrontInformationEdited` v2; PII register in `vendor-pii-fields.ts` must follow |
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
and French practice routinely merges them as **CGU/CGV**. Recommend one page,
two parts, one version number — with the pilot's specifics as a dated annex so the
cohort's terms can be quoted without forking the main text.

Publication: a `/cgu` route in `apps/website`, footer link beside *Mentions légales*,
and the same URL linked from the registration checkbox. The vendor app should link it
too — a vendor meets the terms where they sign, not only where they were sold.

## 8. Site copy that must change before the CGV ships

Decision 6 contradicts what is currently published. The CGV cannot go up while the
landing page promises otherwise — a contract that disagrees with the sales page is worse
than no contract.

| What | Where | Why |
|---|---|---|
| *« Le tarif ne bouge pas — ce qui arrive ensuite est compris, sans supplément. »* | `apps/website/src/pages/index.astro:172` | Withdrawn. Replace with the price-change rule from decision 6, which carries its own reassurance: 3 months' notice, free exit, no increase in the first year |
| Decision entry *"The price freeze ships with the price"* | `WEBSITE-PLAN.md` | Superseded — record it as such rather than deleting, per that doc's own convention |
| Deferred entry *"A 50 € tier (préco + réservation) — deliberately not on the page"* | `WEBSITE-PLAN.md` | Partly superseded: the tier is now a decided direction. Whether it goes *on the page* is still a separate call, and the reasoning there — a pricing table at the moment you ask for trust — still stands |
| Open Item *"Pricing tiers and feature gating"* | `MARKET_MIAM.md` | Partly resolved: two tiers, gated on payment/ordering. What sits in each beyond that is still open |
| *« Premier mois offert. Sans engagement. »* | `index.astro:93,168` | Unchanged and still accurate — decisions 2 and 5 were chosen to keep it true |

## What is needed to start drafting

**Nothing.** §2 is settled, so the draft can be written now against those twelve
premises. Three things run alongside it rather than blocking it:

- **§8 first, or at least in the same breath** — the site and the contract have to stop
  disagreeing about the price freeze before either is published.
- **§3 and §4** change what the draft *claims*, not whether it can be written. §4 is the
  long pole: capturing acceptance at registration needs an event and a checkbox, and a
  vitrine's own mentions légales need a SIREN field the domain does not have.
- **§6** goes to counsel with the draft, not before it.

One number to confirm: the 90-day dormancy cap in decision 2.
