# test

The social test suite. Following outside-in TDD, the domain packages
(`market-days`, `event-sourcing`, `common`, `shared-kernel`, `auth`) are driven
from here through their public surface — use cases, projections, processors, and
shared port contracts — rather than unit-testing internals in isolation. Fakes
live only at the boundaries.

```sh
npx nx test test                 # run the suite
npx nx test:coverage test        # with coverage
npx nx test:container test       # against a real Postgres (Testcontainers)
npx nx mutation test             # Stryker mutation testing
```
