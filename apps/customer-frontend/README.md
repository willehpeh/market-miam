# customer-frontend

The public, customer-facing Angular app — the per-vendor storefront customers reach
at the vendor's subdomain: the vendor's upcoming markets and each one's menu, the
carte (the vendor's catalogue, priced unless the vendor hides prices), and the vendor's
*mentions légales*.

Server-side rendered (Angular SSR, `server.ts`) so vendor storefronts are fast
and shareable (see ADR 0019).

```sh
npx nx serve customer-frontend
npx nx test customer-frontend
npx nx build customer-frontend
```
