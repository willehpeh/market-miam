# admin-frontend

The operator console (`docs/ADMIN-PLAN.md`, ADR 0059): a static Angular app at
`admin.marketmiam.fr`. Operators sign in through Auth0 with GitHub, and the app calls the api's
operator routes under `/api/ops`, which check the `operate` permission.

In development it signs in with a fake and proxies `/api` to the local api, which accepts any
operator token when `NODE_ENV=development`:

```sh
npx nx serve api               # http://localhost:3000
npx nx serve admin-frontend    # http://localhost:4300
npx nx test admin-frontend
npx nx build admin-frontend
```
