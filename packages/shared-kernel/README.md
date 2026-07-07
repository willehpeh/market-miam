# shared-kernel

Identifiers shared across bounded contexts: `VendorId`, `MarketId`, and
`vendorIdFrom` for constructing a `VendorId` from raw input. Kept deliberately
small — only the concepts more than one context must agree on.

## Testing

```sh
npx nx test shared-kernel
```
