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
- Per-day key, e.g. `${vendorId}:orders:${marketId}:${date}`, in Ordering's own key store (see Keys below).

| Sealed under day key | In clear |
|---|---|
| Email (from Checkout; no name, no phone) | Order number, dishes, amounts, times, status, Stripe IDs |
| Collection code | |

- Code: checked server-side; never in vendor read model or API; unique among the day's open orders; failed attempts limited per vendor per day and recorded.
- Only the email processor decrypts the email → no plaintext projection to clean.
- Cash-register closings (daily per market day, monthly, annual) + publisher attestation, for VAT-registered vendors (see Legal → Cash register).
- First scheduler in the API (interval or Render cron): confirmation timeout; key sweep.
- Shred at `endTime`, **not at close**: close is by hand (ADR 0049), vendor can reopen until `endTime` (decision 50).

### Keys

`getOrCreateKeyFor` silently minted a new key after a `DELETE`-based shred, so a late PII write resurrected erased data. Two cases, two fixes:

| Key | Death date | Fix |
|---|---|---|
| Vendor (`${vendorId}`, `:legal`) | Arbitrary (erasure; legal key +5 years) | **Tombstone**: `shred` nulls the key material, keeps the row with `shredded_at`; `getOrCreateKeyFor` throws on it; `findKeyFor` → `null` → `SHREDDED` as now. Also a dated proof of erasure (RGPD art. 5(2)). **Shipped** with mentions légales slice 3, with `shred_after` + a daily `shredDue` sweep (ADR 0056 amendment) |
| Market day (Ordering) | Known at mint: day's `endTime` + grace (hours from ADR 0051) | **Expiry rule, no tombstone**: `shred_after` stored at mint; minting a key already past expiry throws; sweep `DELETE`s expired rows. `MarketDayEndedError` guard still blocks first; the mint rule turns a guard failure into a loud error, not silent retention |

- Day keys live in **their own table** (e.g. `order_data_keys`): different lifecycle (bulk churn, ~78k rows/yr at 500 vendors) and different context (ADR 0048).
- Wiring: **stack a second `ShreddingEventStore`** for Ordering's event types (disjoint from Market Days'), with its own PII registry, its own `DataKeys` over that table, and a resolver `event → { subject, expiresAt }`. Static `KeyScopes` (type → scope) stays for Market Days.
- `DELETE` ≠ instant erasure: old row versions persist until VACUUM; PITR backups hold keys until the window rolls off. Policy B: "deleted at end of market day, gone from backups within N days".

### Live updates

Polling on both sides, web push for the vendor. No WebSockets: every client action (confirm, refuse, code) is a plain HTTP command.

| Page | Mechanism |
|---|---|
| Vendor, foreground | Poll ~5 s. Screen Wake Lock in live mode |
| Vendor, background / screen off | Web push on new order. Timers throttle and connections drop there, SSE included. iOS: installed PWA only, 16.4+ |
| Customer, order pending | Poll ~3–5 s, stop once settled. Email is the fallback |

Vendor latency is dominated by the vendor glancing at the screen, not by the poll interval.

- "Something changed" is an observable port in the frontend; the adapter is a timer now. SSE later = adapter swap, refetch code unchanged.
- Polls answer `304` when nothing changed: per vendor-day latest position held in memory, fed by each instance's LISTEN/NOTIFY (ADR 0030). No DB hit on most polls.

**At 500 vendors** (Saturday-noon estimate: ~400 live vendors at 5 s ≈ 80 req/s; ~2.2 orders/s × 3 min pending ≈ 400 customers at 3 s ≈ 130 req/s; ~200 req/s total, cheap reads):

| Pressure | Mitigation |
|---|---|
| Honeycomb volume: ~17M spans/day from polls vs a free tier of ~20M events/month (check plan) | Sample polls / don't trace `304`s. First thing to hurt |
| Serialized appends (ADR 0028): ~10 appends/s of order events under one global lock | Load-test before scaling — the real ceiling |
| Projection lag: one subscription catches up across all vendors | Measure in Honeycomb; stale list = lag |
| Email: ~3 per order, ~8 000 orders/h peak | Provider tier |
| Manual ops: refund queries, Stripe onboarding, DAC7, cash-register attestations | Not technical; plan for it |

SSE trigger: Honeycomb volume or Render bill. Then poke-only + HTTP refetch, mirroring ADR 0030. `EventSource` can't send `Authorization` (Auth0 bearer) → fetch-based SSE client or cookie, not a token in the URL (leaks to logs). Heartbeat ~30 s.

### Vendor app

- Stripe onboarding as a requirement to take orders (`StorefrontPublication` readiness pattern).
- Live order list: number, dishes, status; confirm / refuse.
- Code input; *remis sans code* per order.
- New-order alerts: web push (see Live updates); email backup.

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
| DAC7 | Seller due diligence + annual DGFiP reporting; sellers <30 sales and <2 000 €/yr excluded from reporting. An *entrepreneur individuel* is likely an individual seller: date of birth + personal tax number (possibly the *numéro fiscal*, not SIRET) beyond `VendorLegalIdentityProvided` v1. Add as a new event version when Ordering lands |
| Customer CGU | Platform terms, separate from vendor CGV |
| Insurance | RC pro for Market Miam as intermediary |
| RGPD | New art. 30 entry for orders. Rewrite policy B: state exactly what survives shred and what Stripe, email provider, Honeycomb (IPs, 60 days) and backups keep. Not "all deleted at end of day" |
| Cash register (art. 286 I 3° bis CGI) | See below |
| E-reporting | Reaches micro-entreprises Sept 2027. Not urgent |
| Pseudonymity | After shred, order records + Stripe IDs remain: pseudonymous, not anonymous |

### Cash register

Per `BOI-TVA-DECLA-30-10-30` (version of 2025-10-01), checked 2026-10-04:

| § | Rule | Effect |
|---|---|---|
| 25 | Franchise-en-base vendors exempt | No obligation for them |
| 30 | Payment providers (L521-1 CMF) excluded; online systems in scope | Stripe excluded, Market Miam likely in scope for VAT-registered vendors |
| 35 | Exempt if *all* payments for *all* sales go via a credit institution | Unusable: vendors also take cash at the stall |
| 290 | Publisher supplies proof; vendor holds it | Market Miam supplies it |

- Publisher self-attestation restored from 2026-02-21 (loi 2026-103 art. 125; `ACTU-2026-00073`), after loi 2025-127 art. 43 removed it. Market Miam can issue attestations (template `BOI-LETTRE-000242`) — no NF525 needed.
- For VAT-registered vendors: order/payment data must be inaltérable, sécurisé, conservé, archivé (ISCA), with daily, monthly and annual closings.
- Fit: append-only event log covers inaltérabilité; a market day is the daily closing. Secured data (receipt no., timestamp, TTC total, item lines, payment data) excludes the customer email, so the shred design holds.
- No *rescrit de portée générale* on caisse found via search (not exhaustive). Accountant to confirm.

## Open

- Confirmation timeout (minutes).
- Code attempts before lockout; lockout length.

## Order of work

1. Lawyer + accountant: cash register (confirm scope + self-attestation route), DAC7, CGV + no-show clause, CGU, P2B, policy B.
2. Stripe platform account; test Standard onboarding with live client.
3. Finish mentions légales; add allergens.
4. Key tombstones for vendor keys (with mentions légales slice 3).
5. Ordering context: payment port, webhooks, idempotency gate, day-key store + expiry, code check, scheduler.
6. Vendor app: onboarding, live order list, code input, *remis sans code*.
7. Storefront: basket, Checkout, status page; email provider.
8. Website rebuilt around ordering.
9. Check signal at markets; pilot with real cards, small amounts.
