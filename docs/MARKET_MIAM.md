# Market Miam — Product Design Summary

Originally the founding vision note (2026-06). Refreshed 2026-08-02 against the
code: the vision sections stand as written; the implementation sections now
describe what is actually built. Architecture detail lives in
`EVENT-SOURCING-ARCHITECTURE.md` and `adr/`; the public pitch is
[marketmiam.fr](https://marketmiam.fr) (`apps/website`, see `WEBSITE-PLAN.md`).

## The Problem

Itinerant food vendors (traiteurs) in France rotate between open-air markets throughout the week. They face three core challenges:

- **Demand uncertainty** — they prepare food without knowing how many customers will show up, leading to waste (overproduction) or missed sales (underproduction).
- **Communication gap** — no structured way to share daily menus, market schedules, or planned absences with their regular customers.
- **Order management** — no lightweight tool to capture customer intent or requests in advance.

## Product Vision

A SaaS platform where each vendor gets their own branded website (Shopify model, not Uber Eats), preserving the personal vendor-customer relationship that defines French marché culture.

- **Subdomain-based** multi-tenancy: `chez-mohamed.marketmiam.fr` — live; subdomain assignment is a publication requirement (ADR 0032), resolved by the subdomain registry. `demo.marketmiam.fr` is a real published storefront in production.
- Vendor app (Angular) + customer storefront (Angular SSR, ADR 0019) + NestJS API, with isolated per-vendor data
- Custom domains (`www.chez-mohamed.fr`) as a potential future paid tier

## Competitive Landscape

|Competitor                                                     |Proximity                                              |Gap                                                                                            |
|---------------------------------------------------------------|-------------------------------------------------------|-----------------------------------------------------------------------------------------------|
|**Goodfynd** (US)                                              |Closest on features — menu, scheduling, pre-orders, POS|US-focused, marketplace model, food truck oriented                                             |
|**Clickeat** (France)                                          |Closest geographically — online ordering for traiteurs |Restaurant-first tool extended to food trucks; doesn’t handle market rotation or schedule model|
|**Shopify**                                                    |General e-commerce, bendable with plugins              |Thinks in products/inventory, not market-day menus                                             |
|**Market management tools** (LocalStalls, ManageMyMarket, etc.)|Adjacent                                               |Solve the market *organizer’s* problem, not the vendor’s                                       |

**The real competitor is informal, zero-cost communication** — WhatsApp groups and Instagram stories. The product must be effortless enough to beat a quick photo posted to social media.

## Key Domain Concepts

Public-facing vocabulary is deliberately the product's, not the code's: *vitrine*
(storefront), *carte* (the standing catalogue), *menu* (the day's offering),
*traiteur* (vendor). See `WEBSITE-PLAN.md` "Vocabulary pass".

### Storefront (vitrine)

The vendor's public page — name, description, phone, cover photo. Opened
automatically on registration (the `OpensStorefronts` processor); published only
when ready: title, cover photo, at least one dish, at least one schedule, and an
assigned subdomain (ADRs 0031/0032; description no longer gates publication,
ADR 0043).

### Catalogue (carte)

The vendor’s living catalog of everything they know how to make. Long-lived, market-independent, accumulates history over time. This is the core differentiator — structured knowledge about the vendor’s business that Instagram can never provide. A dish is flat-priced **or** offered in variants/formats, never both (ADR 0033).

### Calendar

The vendor's recurring market schedules (which markets, which weekdays, what
cadence) plus declared absences. Upcoming market days are **expanded at query
time** from the schedule — never eagerly materialised (see
`archive/MARKET-SCHEDULE-PLAN.md`, "Rejected: eager MarketDay materialisation").
*(The vision draft called this aggregate "Schedule".)*

### MarketDay

A specific vendor, at a specific market, on a specific date — stream key
`market-day/${vendorId}/${marketId}/${date}`, built by `MarketDayId`. Born lazily
on first planning action, not materialised from the schedule; having no creation
moment is why it is addressed by a natural key rather than a minted id. The operational heart of the system:
vendors assemble each day's offering (the *menu du jour*) by selecting items
from their catalogue.

### En direct (live)

A market day the vendor is trading *right now*, with a menu, not yet closed — the
storefront leads with the market it is standing in and each dish carries its
availability. Distinct from **en cours**, which is the calendar's word for *this
market is running by the clock*: a vendor at a market who planned no menu is en
cours but not en direct. The vendor does not announce the start (it follows from
the schedule) but does announce the end, by **closing** the day. Not yet built —
`LIVE-MODE-PLAN.md`.

### Miam

Domain-specific term for a customer expressing appetite/intent for an item. Not a public rating — a private demand signal for the vendor. Avoids the verification/gaming problems of a “like” system. Frames the interaction as “I want to eat this” rather than “I approve of this.” **Not yet built** — the furthest-out item on the public roadmap, and the namesake.

### Item Request

A customer can request a catalogue item for a specific market day — “I wish you’d bring the lamb tagine this Saturday.” Inverts the dynamic from vendor-push to customer-pull. Requires basic anonymous abuse prevention (e.g., one request per item per device per week). Not yet built.

## Post-Market Tracking

Lightweight vendor feedback loop, folded into the menu du jour rather than a
separate phase. **Both halves are shipped.** *During the market:* the vendor taps
*sold out* per dish on the live screen (`ItemMarkedAsSoldOut` /
`ItemMarkedAsAvailable`). *After the market:* *le bilan* — three outcomes per dish
per market day, *bien vendu / moins bien vendu / épuisé*, recorded whole
(`MarketDayBilanRecorded`), with a dashboard prompt for a finished day nobody
judged. See `LIVE-MODE-PLAN.md` slices 1 and 2b.

*(This supersedes the original brought/left quantity design — two numbers per
item deriving sell-through and waste % — which asked for more bookkeeping than
a trader packing up a stand will do.)*

**Trend data per item per market** — the goal that survived that supersession — is
now being built on top of it: the bilans read back as *(dish × market)* piles
rather than scores, since three broad categories over a handful of market days are
useless as a measurement and useful as sorting bins. Backend done, frontend not
started. See `BILAN-RETROSPECTIVE-PLAN.md`.

## Tech Stack (as built)

- **Apps:** `api` (NestJS + `@nestjs/cqrs`), `vendor-frontend` (Angular), `customer-frontend` (Angular SSR — the only SSR app, ADR 0019), `website` (Astro, static marketing page), `admin-api`/`admin-frontend` (internal ops: users, subdomains)
- **Domain:** `packages/market-days` (framework-free), `packages/event-sourcing` (the mechanism, framework-free)
- **Persistence:** Postgres — single append-only `events` table, globally ordered via serialized appends (ADRs 0005/0028/0029); read models projected via polling subscriptions poked by LISTEN/NOTIFY (ADR 0030); in-memory twin of every adapter for the fast suite
- **PII:** crypto-shredding — per-vendor data keys, erasure by key deletion (ADR 0025)
- **Identity:** Auth0 (ADR 0021) · **Photos:** Cloudinary signed uploads · **Hosting:** Render · **Observability:** OpenTelemetry → Honeycomb (ADR 0026)

## Bounded Context: Market Days

A single bounded context, five aggregates: **Vendor**, **Storefront**,
**Catalogue**, **Calendar**, **MarketDay** — plus the subdomain registry and the
read side (vendor storefront, catalogue, market-schedule and customer-storefront
views). A customer-facing bounded context may emerge later as the language
diverges between vendor operations and customer discovery/intent. Billing is
its own context on the shared event log (ADR 0048; integration seam in
`archive/DEFERRED.md`, "Subscription as a publication requirement") — not yet
built. If vendors ever sell to their customers through the platform, that is a
further Ordering context, not an extension of Billing (ADR 0048).

## Event Catalog (as built)

|Event                      |Aggregate |Phase          |
|---------------------------|----------|---------------|
|VendorRegistered           |Vendor    |Setup          |
|StorefrontOpened           |Storefront|Setup (automatic)|
|StorefrontInformationEdited|Storefront|Setup          |
|StorefrontCoverPhotoSet    |Storefront|Setup          |
|StorefrontPublished        |Storefront|Setup          |
|ItemAddedToCatalogue       |Catalogue |Setup          |
|ItemRevised                |Catalogue |Setup          |
|ItemPhotoChanged           |Catalogue |Setup          |
|ItemsReordered             |Catalogue |Setup          |
|ItemRetired                |Catalogue |Lifecycle      |
|MarketScheduleRegistered   |Calendar  |Setup          |
|MarketScheduleAmended      |Calendar  |Setup          |
|MarketScheduleCancelled    |Calendar  |Lifecycle      |
|AbsenceDeclared            |Calendar  |Operational    |
|MarketDayMenuSet           |MarketDay |Before market  |
|ItemMarkedAsSoldOut        |MarketDay |During market  |
|ItemMarkedAsAvailable      |MarketDay |During market  |
|MarketDayClosed            |MarketDay |During market  |
|MarketDayReopened          |MarketDay |During market  |
|MarketDayBilanRecorded     |MarketDay |After market   |
|MarketPricesSet            |Calendar  |Setup          |

### Events still to come

- The customer-signal events (`ItemMiamed`, `ItemRequested`) — nothing built
- `AbsenceCancelled` (declared absences can't yet be retracted)

The market-day lifecycle events this list used to promise have all landed —
`MarketDayClosed`/`MarketDayReopened` (no `open`: the start follows from the
schedule), `ItemMarkedAsAvailable`, and `MarketDayBilanRecorded`, the post-market
outcome event that hangs off closing.

## MVP Strategy — status

The MVP is **vendor-facing first**: the catalogue and market day planning tool, with the customer-facing published page as the visible output.

1. **Build the catalogue** — ✅ shipped end-to-end (add, revise, re-photo, retire, reorder, variants)
1. **Plan market days** — ✅ shipped end-to-end (`SetMarketDayMenu` → `MarketDayMenuSet`, the whole day's menu in one command; read model, `PUT /market-days/:marketId/:date/menu`, the menu joined onto upcoming days, a *Prochain marché* card and menu editor in the vendor app, and the day's menu leading the storefront) — see `MENU-DU-JOUR-PLAN.md`
1. **Publish** — ✅ shipped: publication readiness + public storefront (next market, upcoming markets, absences) at the vendor's subdomain, with the carte on its own `/carte` page — see `LIVE-MODE-PLAN.md` slice 0
1. **Sold-out tracking** — ✅ shipped: per-dish marks during service on the vendor's live screen, greyed in place on the customer storefront — see `LIVE-MODE-PLAN.md` slice 1
1. **Post-market review** — ✅ shipped: *le bilan* on its own route, the whole set in one submit, the *épuisé* prefill a recorded bilan outranks, and a dashboard prompt for an unjudged day — see `LIVE-MODE-PLAN.md` slice 2b. Reading it back across market days is in progress (`BILAN-RETROSPECTIVE-PLAN.md`)

Later phases: customer miams, item requests, notifications, pre-ordering.

## Business Model

Subscription-based (monthly fee) rather than transaction-based (commission per order). Aligns incentives with vendor success rather than extracting from their margins. Named on the website: free during the pilot, then 15 € HT/month. Pricing tiers and feature gating remain undecided (Open Items) — which is why no tier split appears publicly.

## Trademark Note

The original name “Market Monster” carried a minor risk from Monster Beverage Corporation, which has filed over 1,000 trademark cases (including forcing Ubisoft to rename “Gods & Monsters”). The project was renamed to “Market Miam” to sidestep this. The INPI check came back **clear** (2026-08); trademark registration has been **requested and is awaiting confirmation**.

## Open Items

- Customer-facing bounded context design (when customer signals land)
- Notification mechanics (for item requests, sold-out alerts)
- Pricing tiers and feature gating — blocks any public tier split (`WEBSITE-PLAN.md`)
- Trademark registration confirmation (requested 2026-08; INPI check came back clear)

*(Resolved since the vision draft: aggregate boundaries and invariants — see the
aggregates above and `adr/`; projection strategy — polling subscriptions +
persisted read models, ADRs 0015/0016/0030; SSR — shipped for the customer
storefront only, ADR 0019.)*
