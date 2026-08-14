# Contributing to MarketMiam

Thanks for your interest in MarketMiam. Contributions are welcome — with two
caveats up front. First, this is the codebase of a commercial product that
happens to be free software, not a community-run project — see
[Licensing](#licensing-and-the-commercial-product) below for what that means
for your contribution. Second, this is a deliberately opinionated codebase. Event sourcing,
CQRS, hexagonal architecture, and outside-in TDD are not incidental choices,
and pull requests that cut against them are unlikely to land, however good the
code. Read this page first and you'll save us both a review round.

## Before you start

- Skim the [README](README.md) for the shape of the monorepo.
- Skim [`docs/MARKET_MIAM.md`](docs/MARKET_MIAM.md) for what the product is
  and who it serves.
- Check [`docs/adr/`](docs/adr/README.md). Most "why is it done this way?"
  questions are answered by an ADR, and a PR that reverses a recorded decision
  without discussing it first will be closed with a pointer to the ADR.

You don't need an issue to open a PR — small fixes are welcome directly. For
anything larger, opening an issue first is a kindness to yourself: it lets us
agree on the approach before you invest the effort.

## Getting set up

You'll need Node 24+ and Docker (for Postgres and Testcontainers).

```sh
npm ci
docker compose up -d           # local Postgres
npx nx serve api               # run the backend
npx nx serve vendor-frontend   # run a frontend
```

Running the tests:

```sh
npx nx test test               # the social test suite (see test/README.md)
npx nx test <project>          # a project's own tests
npx nx test:container test     # against a real Postgres (Testcontainers)
npx nx mutation test           # Stryker mutation testing
npm run test:all               # everything
```

## How this codebase works

None of this is a checklist you'll be graded against — the real gate is that
CI is green and the change fits the architecture. But this is how the code you
are modifying was written, and changes read best when they match it:

- **Outside-in TDD.** Behaviour is driven from the social test suite in
  [`test/`](test/README.md) through public surfaces — use cases, projections,
  processors, port contracts — not by unit-testing internals. Fakes live only
  at the boundaries ([ADR 0006](docs/adr/0006-outside-in-tdd-with-fakes.md)).
  Start a change by writing or extending a test there.
- **The domain is framework-agnostic.** Packages under `packages/` know
  nothing about NestJS or Angular. Framework glue lives in `apps/` and the
  `*-nestjs` adapters. Nx enforces the boundaries; don't fight the lint rule,
  it's telling you the code is in the wrong place.
- **Tell, don't ask.** Aggregates and value objects expose behaviour, not
  state ([ADR 0008](docs/adr/0008-no-getters-setters.md)). If you find
  yourself adding a getter to make a test pass, the test is probably in the
  wrong place.
- **Validation lives in constructors** for value objects
  ([ADR 0007](docs/adr/0007-value-object-constructor-validation.md)) and in
  Zod at the transport edge
  ([ADR 0046](docs/adr/0046-request-shape-gated-by-zod-at-the-transport-edge.md)).
- **Architectural changes get an ADR.** If your change makes a decision the
  next person would ask "why?" about, add a short ADR in `docs/adr/`
  following the existing format. Small fixes don't need this ceremony.

## Pull requests

- Keep PRs small and focused — one behaviour or fix per PR.
- Say what the change does and why, in the description. Link an issue or ADR
  if one exists.
- CI runs `lint`, `typecheck`, `test`, `test:container`, and `build` on
  affected projects. Run them locally first; `npx nx affected -t lint
  typecheck test` catches most of it.
- Mutation testing runs separately. You don't have to run Stryker for every
  PR, but if you're touching the domain packages, surviving mutants in your
  new code will come up in review.

Review here is direct. Comments are about the code, never about you, and
pushback on an approach is normal — several ADRs exist precisely because a
first approach didn't survive scrutiny. If a PR doesn't fit the project's
direction it will be declined with an explanation, and that's not a judgment
of its quality.

## AI-assisted contributions

Using AI tools to write code here is fine — much of this codebase was built
with them. Two expectations:

1. **You own every line.** You've read it, you understand it, you've run the
   tests, and you can defend it in review. "The model wrote it" is not an
   answer to a review comment.
2. **Disclose substantial generation.** If a change is substantially
   AI-generated, say so in the PR description. It changes nothing about
   whether it's accepted — it just helps review focus on the right things.

Unreviewed, machine-generated PRs are closed without discussion.

## Licensing, and the commercial product

Be aware of what you're contributing to: **MarketMiam is a for-profit
product.** The hosted service is run commercially by its author. The code is
[AGPL-3.0-or-later](LICENSE) deliberately, not incidentally — anyone is free
to study it, self-host it, fork it, or build a competing service on it, on the
condition that they share their source in turn. If contributing to a codebase
that also powers a commercial service isn't a trade you want to make, that's
a perfectly good reason not to contribute.

The trade is symmetric, though. By submitting a contribution you agree that
it's your own work (or that you have the right to submit it) and that it's
licensed under the same terms — inbound = outbound, no CLA. That cuts both
ways: because there's no CLA, your contribution stays AGPL permanently, and
the project cannot be relicensed proprietary out from under the people who
built it.

## Community

Be the kind of person you'd want at the next stall over. The
[Code of Conduct](CODE_OF_CONDUCT.md) applies to all project spaces —
issues, PRs, reviews, and discussions.
