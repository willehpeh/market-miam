# Market Monster — Product Design Summary

## The Problem

Itinerant food vendors (traiteurs) in France rotate between open-air markets throughout the week. They face three core challenges:

- **Demand uncertainty** — they prepare food without knowing how many customers will show up, leading to waste (overproduction) or missed sales (underproduction).
- **Communication gap** — no structured way to share daily menus, market schedules, or planned absences with their regular customers.
- **Order management** — no lightweight tool to capture customer intent or requests in advance.

## Product Vision

A SaaS platform where each vendor gets their own branded website (Shopify model, not Uber Eats), preserving the personal vendor-customer relationship that defines French marché culture.

- **Subdomain-based** multi-tenancy: `chez-mohamed.votreplateforme.fr`
- Single Angular + NestJS application, with per-vendor theming and isolated data
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

### catalogue

The vendor’s living catalog of everything they know how to make. Long-lived, market-independent, accumulates history over time. This is the core differentiator — structured knowledge about the vendor’s business that Instagram can never provide.

### MarketDay

A specific vendor, at a specific market, on a specific date. The operational heart of the system. Vendors assemble each market day’s offering by selecting items from their catalogue. Has a natural lifecycle: planned → published → in progress → completed.

### Miam

Domain-specific term for a customer expressing appetite/intent for an item. Not a public rating — a private demand signal for the vendor. Avoids the verification/gaming problems of a “like” system. Frames the interaction as “I want to eat this” rather than “I approve of this.”

### Item Request

A customer can request a catalogue item for a specific market day — “I wish you’d bring the lamb tagine this Saturday.” Inverts the dynamic from vendor-push to customer-pull. Requires basic anonymous abuse prevention (e.g., one request per item per device per week).

## Post-Market Tracking

Lightweight vendor feedback loop after each market day:

- **During the market:** vendor taps “sold out” on items as they run out (also updates the customer-facing live view)
- **After the market:** vendor logs remaining quantities for items that didn’t sell out

Two numbers per item: **brought** (before) and **left** (after). The system derives sold quantity, sell-through rate, and waste percentage. Over time, builds trend data per item per market.

## Tech Stack

- **Frontend:** Angular
- **Backend:** NestJS
- **Database:** Postgres
- **Architecture:** Event Sourcing + CQRS

Concurrency per tenant is near zero, making event sourcing a natural fit. Single shared database with a `vendor_id` scope. Events stored in a single `events` table with `stream_id`, `stream_type`, `event_type`, `version`, `data` (jsonb), `timestamp`.

## Bounded Context: Market Days

A single bounded context for now, containing four aggregates:

- **Vendor** — identity, branding, profile
- **catalogue** — the item catalog
- **Schedule** — which markets, which days, absences
- **MarketDay** — the concrete occurrence with planned items, customer signals, and outcomes

A customer-facing bounded context may emerge later as the language diverges between vendor operations and customer discovery/intent.

## Event Catalog

|Event                   |Aggregate |Phase          |
|------------------------|----------|---------------|
|VendorRegistered        |Vendor    |Setup          |
|ScheduleCreated         |Schedule  |Setup          |
|MarketDayAddedToSchedule|Schedule  |Setup          |
|AbsenceDeclared         |Schedule  |Operational    |
|AbsenceCancelled        |Schedule  |Operational    |
|ItemAddedTocatalogue   |catalogue|Setup          |
|ItemPlannedForMarketDay |MarketDay |Before market  |
|ItemDroppedFromMarketDay|MarketDay |Before market  |
|MarketDayPublished      |MarketDay |Before market  |
|ItemMiamed              |MarketDay |Customer signal|
|ItemRequested           |MarketDay |Customer signal|
|ItemSoldOut             |MarketDay |During market  |
|ItemWastageMeasured     |MarketDay |After market   |

### Events still to consider

- `ItemUpdated` / `ItemRetired` (catalogue lifecycle)
- `VendorProfileUpdated` (branding changes)
- `ItemQuantityAdjusted` (vendor changes planned quantity before the day)
- `MarketDayCompleted` (explicit lifecycle boundary — deferred for now, using date as implicit proxy)

## MVP Strategy

The MVP is **vendor-facing first**: the catalogue and market day planning tool, with the customer-facing published page as the visible output.

1. **Build the catalogue** — vendor creates their catalog of items
1. **Plan market days** — select items from catalogue, optionally set quantities
1. **Publish** — customer-facing page shows what’s coming
1. **Sold-out tracking** — live updates during the market
1. **Post-market review** — log remaining quantities

Later phases: customer miams, item requests, notifications, pre-ordering.

## Business Model

Subscription-based (monthly fee) rather than transaction-based (commission per order). Aligns incentives with vendor success rather than extracting from their margins.

## Trademark Note

The name “Market Monster” carries a minor risk from Monster Beverage Corporation, which has filed over 1,000 trademark cases (including forcing Ubisoft to rename “Gods & Monsters”). The risk is low given the different industry and geography (France), but worth a formal check on INPI and EUIPO before committing to the name.

## Open Items

- Aggregate boundary details and invariant rules
- Projection strategy for read models
- Customer-facing bounded context design
- Notification mechanics (for item requests, sold-out alerts)
- SSR for SEO (valuable for market discovery but not MVP)
- Pricing tiers and feature gating
