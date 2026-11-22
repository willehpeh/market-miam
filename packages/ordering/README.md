# ordering

The Ordering context (ADR 0066): customers order and pay from a live market day's menu, the vendor
confirms each order, and the customer collects with a code. Here the vendor is the merchant.

## What's here

- **The merchant's payment account** (ADRs 0067, 0068) — `StartPaymentAccountRegistration`
  opens a registration once the vendor's storefront is published; `CreatesPaymentAccounts`
  reacts by creating the account with Stripe through the `PaymentAccounts` port, and dispatches
  `FailPaymentAccountRegistration` if Stripe refuses it.
- **Stripe's notices about the account** — `DetectPaymentAccountUpdate` records each notice
  Stripe's webhook delivers; `ChecksPaymentAccounts` reacts by dispatching
  `ObservePaymentAccount`, which records what changed: the registration confirmed, the account
  enabled or disabled, an issue detected or resolved.
- **Orders** — `PlaceOrder` takes an order Stripe holds a card for and records it placed, or
  refused if the market day was closed or has ended, or one of its dishes sold out or left the
  menu while the customer paid.

It depends on `event-sourcing`, `shared-kernel` and `common` only, never on Market Days (ADR 0070
enforces it): what it needs from Market Days it asks through ports of its own,
`PublishedStorefronts` and `TradingDays`. The api implements `PublishedStorefronts` over Market
Days' published query; `TradingDays` has only its in-memory fake so far, as no route places an
order yet.

## Testing

Its specs live in the `test` project, under `test/src/ordering/`:

```sh
npx nx test test
```
