# customer-frontend

The public, customer-facing Angular app — the per-vendor storefront that
customers visit to see market-day menus, schedules, and express interest
(*miam*) or request items.

Server-side rendered (Angular SSR, `server.ts`) so vendor storefronts are fast
and shareable (see ADR 0019).

```sh
npx nx serve customer-frontend
npx nx test customer-frontend
npx nx build customer-frontend
```
