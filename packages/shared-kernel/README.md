# shared-kernel

What more than one bounded context must agree on, and nothing else:

- the identifiers, `VendorId` and `MarketId`;
- how a vendor's events are scoped (ADR 0009): `VendorScopedRepository` names a vendor's
  streams after the vendor, `VendorScopedEvents` stamps the vendor's id into each event's metadata
  under `VENDOR_ID_METADATA_KEY`, and `vendorIdFrom` reads it back.

## Testing

Its specs live in the `test` project, under `test/src/shared-kernel/`:

```sh
npx nx test test
```
