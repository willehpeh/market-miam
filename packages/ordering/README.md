# ordering

The Ordering context (ADR 0066): customers order and pay from a live market day's menu, the vendor
confirms each order, and the customer collects with a code. Here the vendor is the merchant. The
first slice is the merchant's payment account (ADR 0068): registering with Stripe, creating the
account, and recording what Stripe says about it (ADR 0067).

It depends on `event-sourcing`, `shared-kernel` and `common` only, never on Market Days (ADR 0070
enforces it): what it needs from Market Days it asks through ports of its own, which the api
implements over Market Days' published queries.

## Testing

Its specs live in the `test` project, under `test/src/ordering/`:

```sh
npx nx test test
```
