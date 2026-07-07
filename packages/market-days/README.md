# market-days

The domain package — the heart of MarketMiam. Vendors, storefronts, market
schedules, catalogues, and the market-day lifecycle live here as event-sourced
aggregates, with the commands, events, projections, and processors that drive
them.

## What's here

- **Aggregates** — five write models, each rehydrated from its event stream:
  - `Vendor` — registration and vendor-level identity.
  - `Storefront` — the vendor's public storefront: information and cover photo.
  - `Calendar` — the vendor's recurring market schedule.
  - `Catalogue` — the vendor's items (`ItemName`, `ItemDescription`, `ItemPrice`).
  - `MarketDay` — items planned for a specific day, their `Quantity`, and
    sold-out state.
- **Commands** — one module per command (`Command` + `CommandHandler`), each
  raising a single event; multi-stream effects go through processors, not
  handlers. Grouped by aggregate:
  - Vendor: `register-vendor`
  - Storefront: `open-storefront`, `edit-storefront-information`,
    `set-storefront-cover-photo`
  - Calendar: `register-market-schedule`
  - Catalogue: `add-item-to-catalogue`, `change-item-price`, `retire-item`
  - MarketDay: `plan-items-for-market-day`, `unplan-item-from-market-day`,
    `mark-item-as-sold-out`
- **Processors** — `OpensStorefronts`: on `VendorRegistered`, dispatches
  `OpenStorefront` (the single-event-per-command rule kept intact — cross-stream
  reactions live here, not in handlers).
- **Read models** — `catalogue-view` and `vendor-storefront-view`: projections
  and their in-memory stores, plus a NestJS query handler
  (`find-vendor-storefront.handler.ts`) on the read side.
- **Repositories** — per-aggregate loaders/savers (`Vendors`, `Storefronts`,
  `Calendars`, `Catalogues`) over the vendor-scoped base
  (`vendor-scoped-repository`, `VendorScopedEvents`): streams are scoped to a
  vendor.

Builds on `event-sourcing`, `shared-kernel`, and `common`. Framework-agnostic
apart from the CQRS command/query wiring, which types over `@nestjs/cqrs`.

## Testing

No specs of its own — a `typecheck`-only Nx project. Its behaviour is covered
socially from the top-level `test` project (use-case, projection and processor
specs). See that package's README.

```sh
npx nx test test              # the suite that exercises this package
npx nx typecheck market-days
```
