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
| Price freeze: *le tarif ne bouge pas, ce qui arrive ensuite est compris* | `index.astro:172` |
| Pilot = 5–10 hand-onboarded traiteurs; ends when the cohort fills, no date promised | `WEBSITE-PLAN.md` |
| No billing system — invoiced by hand, non-payment handled by unpublishing by hand | `WEBSITE-PLAN.md` decisions; ADR 0048 |
| Hosting Render (US), identity Auth0 (Okta, US), photos Cloudinary, forms Tally (BE) | `MARKET_MIAM.md`, `PRIVACY-PLAN.md` |
| Erasure is irreversible by design; state the consequence, never the algorithm | ADR 0025, `PRIVACY-PLAN.md` |
| Storefront lives at a subdomain; assignment is a publication requirement | ADRs 0031/0032 |
| No ordering, no payment, no delivery on-platform — customers phone the vendor | `storefront-footer.ts` (*Réservations & commandes : <tel>*) |
| Scope of what actually ships: vitrine, carte, calendrier, menu du jour, épuisé, bilan, repères | `MARKET_MIAM.md` MVP status |
| Trademark: INPI check clear, registration requested 2026-08, **confirmation pending** | `MARKET_MIAM.md` |

## 2. Blocking decisions — only the owner can make these

Each carries a recommended default. A draft can be written against the defaults with
the clause marked, but none of them is safe to guess silently.

1. **Eligibility and B2B-only.** Professionals only? SIREN required at signup? France
   only? This decides whether consumer law reaches the contract at all — and note
   art. L221-3 C. conso extends consumer protections to professionals with ≤5 employees
   contracting *outside their main activity*, which a traiteur buying a vitrine is
   arguably doing. *Default: B2B only, France only, declared professional activity
   warranted by the vendor; grant a 14-day withdrawal right anyway as cheap insurance.*
2. **When the paid month starts.** At registration, or at storefront publication? The
   free month runs from which of the two? What happens to an account that registers and
   never publishes? *Default: billing starts at first publication; unpublished accounts
   are free and dormant.*
3. **Billing cycle and invoicing mechanics.** Monthly anniversary or calendar month?
   Pro rata on mid-month termination, or month indivisible? Payment means (virement,
   prélèvement SEPA, Stripe link)? Payment term in days? *Default: monthly anniversary,
   no pro rata, no refund, invoice by email, 30 days net.* French B2B CGV must state
   late penalties (min. 3× taux d'intérêt légal) and the 40 € indemnité forfaitaire —
   those are mandatory mentions, not negotiable, but the payment term is a choice.
4. **Non-payment ladder.** How many days of grace, how much notice before the vitrine
   is unpublished, is data kept during suspension, when is the account deleted?
   Today this is entirely manual and undocumented. *Default: reminder at D+7,
   unpublish at D+15 with notice, account and data kept 3 months, then deleted.*
5. **How the vendor terminates, and what happens next.** There is no cancellation UI —
   is email to `contact@` the route? Notice period? On termination: is the subdomain
   released for reuse, is an export offered, how long before erasure? *Default: email,
   effective end of the paid month, subdomain released after 30 days, export on request,
   erasure at 30 days.*
6. **What the price freeze actually promises.** *Le tarif ne bouge pas* is published.
   Is it perpetual and personal to the pilot cohort, or a freeze for a stated term
   for everyone? The CGV cannot be vaguer than the landing page without contradicting
   it. *Default: perpetual for pilot vendors as long as the subscription runs without
   interruption; a stated notice period (3 months) for everyone else.*
7. **Availability and support commitment.** Any uptime figure, maintenance windows,
   support channel and response time? *Default: obligation de moyens, no SLA figure,
   support by email best-effort, planned maintenance announced in advance.* Note the
   product has no status page and no backup/restore commitment written anywhere.
8. **Is the hand-onboarding contractual?** The site promises *nous mettons votre vitrine
   en place avec vous*. Is that a deliverable of the pilot contract or a courtesy?
   *Default: named in the pilot annex as an included service, not an obligation de
   résultat, and time-boxed.*
9. **Marketing permissions.** `WEBSITE-PLAN.md` wants dashboard screenshots, storefront
   shots and a client testimonial, and already links a live demo storefront. Does
   subscribing grant Market Miam a right to show the vendor's vitrine, name and logo as
   a reference? *Default: yes, opt-out, revocable on request.*
10. **Termination for cause by Market Miam.** Grounds (illegal content, non-payment,
    abuse), notice, and whether there is an appeal. Needed regardless, and required in
    a specific shape if DSA/P2B apply — see §6.
11. **Change-of-terms process.** Notice period, how vendors are told, what a refusal
    means. *Default: 30 days by email, refusal = termination without penalty.* Note P2B
    would impose a 15-day floor if it applies.
12. **Jurisdiction and applicable law.** French law is a given; the competent court is
    a choice, and the éditeur is an EI not registered at the RCS. *Default: French law,
    tribunal judiciaire de Bobigny.* Also decide: French only, or a translated version
    with French prevailing.

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
  changes, and statements of reasons on suspension. **Recommendation: draft to that
  standard anyway** — it costs three clauses and closes the question, and the answer
  flips outright if item requests or pre-ordering ever ship.
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

## What is needed to start drafting

§2's twelve decisions. §3 and §4 can run in parallel — they change what the draft
*claims*, not whether it can be written — and §4's items are the ones that need code,
so they want starting early. Nothing else is blocking.
