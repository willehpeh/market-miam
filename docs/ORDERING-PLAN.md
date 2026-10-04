# Ordering — plan

Live client and every prospect: Market Miam unusable until customers can order. Decided 2026-10-04.

## Scope

| In | Out |
|---|---|
| Same-day orders from a live market day's menu | Pre-orders before the market day |
| Paid online at order (no-shows already hurt vendors) | Pay at stand |
| Vendor confirms each order | Delivery (changes hygiene regime) |
| 6-digit collection code, typed by vendor | QR codes (slower for vendor) |
| *Remis sans code* escape hatch | Customer accounts |
| Customer PII shredded at end of day | Per-dish quantities (vendor refuses instead) |
| | Application fee — "no commission" holds |

## Flow

1. Customer picks dishes on storefront → Stripe Checkout. Card **authorised, not charged**.
2. Order appears on vendor live screen: number, dishes, status. **Never the code.**
3. Vendor confirms → capture → code to customer only (status page + email).
4. Vendor refuses, or timeout → hold cancelled, nothing charged, customer emailed.
5. At stall: customer gives code, vendor types it → server matches day's open orders → *remis* → screen shows that order's dishes.
6. Lost code: vendor picks order → *remis sans code*. Own event. Customer emailed immediately, so a false hand-over is visible to the real customer.
7. At day's `endTime`: unconfirmed holds cancelled; paid + uncollected = no-show, vendor keeps money; day's PII key shredded.

Authorise-before-confirm, not confirm-then-pay: avoids customer returning to pay (no-show in small), blocks fake orders (bad card fails before vendor sees it).

Vendor never knows the code: stops pickups off a customer-visible tablet, and a vendor claiming "someone already collected it".

## Payment

- Stripe Connect, **Standard accounts, direct charges**. Vendor = merchant of record; Stripe does KYC, payouts, disputes. Market Miam never holds funds → no DSP2 licence.
- Hosted Stripe Checkout, `capture_method: 'manual'`. 3DS, Apple/Google Pay, PCI SAQ A.
- Fees ~1.5% + 0.25 € per EEA card, vendor pays (check current). First payout ~7 days.
- **Order cap 119,99 €.** ≥120 € online contracts must be archived 10 years (L213-1, D213-1), breaking one-day retention.

## Engineering

### Domain / API

- New context `packages/ordering` on shared event log (ADR 0048). Orders attach only to live days, whose stream exists (menu set) → no MarketDay materialisation (LIVE-MODE decision 50 trigger not fired).
- Payment port + in-memory fake; Stripe adapter. Local webhooks via Stripe CLI.
- Webhooks: verify signatures (`rawBody: true`); at-least-once → idempotency front gate (`docs/archive/DEFERRED.md` "Client-supplied idempotency") now required.
- Order confirmed from webhook only, never from redirect.
- Per-day key: make `scoped()` in `packages/event-sourcing/src/adapters/shredding.event-store.ts` dynamic, e.g. `${vendorId}:orders:${marketId}:${date}`.

| Sealed under day key | In clear |
|---|---|
| Email (from Checkout; no name, no phone) | Order number, dishes, amounts, times, status, Stripe IDs |
| Collection code | |

- Code: checked server-side; never in vendor read model or API; unique among the day's open orders; failed attempts limited per vendor per day and recorded.
- Only the email processor decrypts the email → no plaintext projection to clean.
- First scheduler in the API (interval or Render cron): confirmation timeout; shred at `endTime`.
- Shred at `endTime`, **not at close**: close is by hand (ADR 0049), vendor can reopen until `endTime` (decision 50).
- `getOrCreateKeyFor` silently recreates a shredded key on a late PII write. `MarketDayEndedError` guard must keep blocking orders after `endTime`.

### Vendor app

- Stripe onboarding as a requirement to take orders (`StorefrontPublication` readiness pattern).
- Live order list: number, dishes, status; confirm / refuse.
- Code input; *remis sans code* per order.
- New-order alerts: email first, web push optional.

### Storefront (`customer-frontend`)

- Basket, Checkout redirect, order-status page behind unguessable link (live updates, shows code).
- Allergens per dish (INCO 1169/2011 art. 14).
- Per-vendor CGV page; prices TTC.

### Infrastructure

- Stripe platform account.
- Transactional email provider (e.g. Brevo: French, EU-hosted) + DPA.
- Render Postgres backups + PITR: losing the DB = money taken with no order.
- Payment-failure alert — both Honeycomb triggers already used.
- Mobile signal at clients' markets: confirm and code check need network.

### Website

Holding page live (`9e054a0`, `WEBSITE-PLAN.md`). Rebuild around ordering once shipped. Pricing promise dropped: live client co-designed pricing, has a year free.

## Legal (lawyer + accountant)

Prerequisite: `MENTIONS-LEGALES-PLAN.md` slices 3–9 (vendor identity + médiateur on page).

| Area | Point |
|---|---|
| Consumer (vendor = seller) | Distance contract (L221-1). CGV template from Market Miam: charge captured on confirmation; no withdrawal for perishables (L221-28 4°); confirmation email = durable medium (L221-13) |
| No-show clause | Typed code proves collection; *remis sans code* is weaker; no entry does **not** prove the customer never came. Word clause accordingly |
| P2B Reg. 2019/1150 | Vendor terms need specific clauses |
| DSA | Marketplace duties (arts. 29–32) likely exempt for micro-enterprise — confirm |
| DAC7 | Seller due diligence + annual DGFiP reporting; sellers <30 sales and <2 000 €/yr excluded from reporting |
| Customer CGU | Platform terms, separate from vendor CGV |
| Insurance | RC pro for Market Miam as intermediary |
| RGPD | New art. 30 entry for orders. Rewrite policy B: state exactly what survives shred and what Stripe, email provider, Honeycomb (IPs, 60 days) and backups keep. Not "all deleted at end of day" |
| Cash register (art. 286 I 3° bis CGI) | VAT-registered vendors may need certified software; franchise vendors exempt. **Could block VAT-registered vendors — resolve first** |
| E-reporting | Reaches micro-entreprises Sept 2027. Not urgent |
| Pseudonymity | After shred, order records + Stripe IDs remain: pseudonymous, not anonymous |

## Open

- Confirmation timeout (minutes).
- Code attempts before lockout; lockout length.
- Status page updates: polling or SSE.

## Order of work

1. Lawyer + accountant: cash register, DAC7, CGV + no-show clause, CGU, P2B, policy B.
2. Stripe platform account; test Standard onboarding with live client.
3. Finish mentions légales; add allergens.
4. Ordering context: payment port, webhooks, idempotency gate, per-day key, code check, scheduler.
5. Vendor app: onboarding, live order list, code input, *remis sans code*.
6. Storefront: basket, Checkout, status page; email provider.
7. Website rebuilt around ordering.
8. Check signal at markets; pilot with real cards, small amounts.
