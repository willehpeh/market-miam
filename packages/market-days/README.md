# market-days

The Market Days context (ADR 0004): vendors, their storefronts, catalogues and market
schedules, and each market day as it is traded. Event-sourced aggregates with the commands,
events, projections, processors and queries that drive them.

## What's here

- **Aggregates** — five write models, each rehydrated from its event stream:
  - `Vendor` — invitation, registration, legal identity, subdomain, the sign-in account's
    opening and closing, and erasure.
  - `Storefront` — the vendor's public storefront: information, cover photo, publication,
    and whether the carte shows prices.
  - `Calendar` — the vendor's markets: recurring schedules, absences, and prices per market.
  - `Catalogue` — the vendor's items (`ItemName`, `ItemDescription`, `Price` or `Variants`,
    `Allergens`), in the vendor's order.
  - `MarketDay` — one day at one market: its menu, which dishes are sold out, whether it was
    closed by hand, and its bilan.
- **Commands** — one module per command (`Command` + `CommandHandler`), each raising a single
  event (ADR 0009); multi-stream effects go through processors, not handlers. By aggregate:
  - Vendor: `invite-vendor`, `register-vendor`, `provide-vendor-legal-identity`,
    `assign-subdomain`, `record-vendor-account-opened`, `record-vendor-account-closed`,
    `erase-vendor`
  - Storefront: `open-storefront`, `edit-storefront-information`, `set-storefront-cover-photo`,
    `publish-storefront`, `show-carte-prices`, `hide-carte-prices`
  - Calendar: `register-market-schedule`, `amend-market-schedule`, `cancel-market-schedule`,
    `declare-absence`, `set-market-prices`
  - Catalogue: `add-item-to-catalogue`, `revise-item`, `change-item-photo`, `retire-item`,
    `reorder-items`
  - MarketDay: `set-market-day-menu`, `mark-item-as-sold-out`, `mark-item-as-available`,
    `close-market-day`, `reopen-market-day`, `record-bilan`
- **Processors** — the cross-stream reactions:
  - `OpensStorefronts` — on `VendorRegistered`, dispatches `OpenStorefront`.
  - `OpensVendorAccounts` — on `VendorInvited`, opens the vendor's sign-in account through
    the `VendorAccounts` port, then dispatches `RecordVendorAccountOpened`, or `EraseVendor`
    if it cannot.
  - `ClosesVendorAccounts` — on `VendorErased`, closes the account and dispatches
    `RecordVendorAccountClosed`.
  - `ErasesVendors` — on `VendorErased`, shreds the vendor's data key and frees their
    subdomain.
- **Read models** — projections, each with an in-memory store and a Postgres one (over
  `event-sourcing`'s `Queryable`): `catalogue-view`, `vendor-storefront-view`,
  `vendor-legal-identity-view`, `market-schedule-view`, `market-prices-view`,
  `market-day-view`.
- **Queries** — `find-*` handlers on the read side: the vendor's catalogue, storefront, legal
  identity, schedules, market prices and selling record; a market day, the upcoming and the
  unrated ones; and `find-customer-storefront`, the public storefront a customer sees.
- **Repositories** — per-aggregate loaders/savers (`Vendors`, `Storefronts`, `Calendars`,
  `Catalogues`, `MarketDays`) over `VendorScopedEvents`: streams are scoped to a vendor.
- **Ports** — `VendorAccounts` (the sign-in accounts, Auth0 in the api) and
  `SubdomainRegistry` (who holds which subdomain, in memory or on Postgres).

Builds on `event-sourcing`, `shared-kernel`, and `common`. Framework-agnostic apart from the
CQRS command/query wiring, which types over `@nestjs/cqrs`.

## Testing

No specs of its own — a `typecheck`-only Nx project. Its behaviour is covered socially from
the top-level `test` project, under `test/src/market-days/` (use-case, projection and
processor specs, port contracts, and Postgres container specs). See that project's README.

```sh
npx nx test test              # the suite that exercises this package
npx nx test:container test    # its Postgres read models against a real database
npx nx typecheck market-days
```
