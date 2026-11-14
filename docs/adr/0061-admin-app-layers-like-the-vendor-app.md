# 0061. The admin app layers like the vendor app: NgRx behind facades, smart and dumb components

Date: 2026-11-13 · Status: Accepted

Amends ADR 0059 (the admin app without an NgRx bridge). Extends ADR 0022 (frontend ports and
facades) to the admin app. Builds on ADR 0006.

## Context

ADR 0059 kept the admin app to one page that called its `Auth` port and `HttpClient` directly, and
left ADR 0022's facade for "the first page that shares auth state". That page has come. The account
list and the invitation form share state: an invitation must reload the list. Wired through the
page, that coordination would sit in components, and the form had begun to own outcomes no
component should, mapping the api's refusals itself.

## Decision

**The admin app takes the vendor app's layering (ADR 0022).**

- **A port with an HTTP adapter** for each thing the app asks the api: the accounts, invitations.
  Sign-in stays behind the `Auth` port, and its state goes in the store like the rest.
- **NgRx Store and Effects hold the state.** Effects call the ports; reducers record what came
  back. The same packages and patterns as the vendor app, so nothing new is installed.
- **Facades**: abstract classes exposing signals and commands, each with one store-backed
  implementation and a fake for tests. Components see facades only, never the store, a port or
  `HttpClient`.
- **Smart and dumb components.** A smart component, a page, injects facades. Dumb components take
  inputs and emit outputs, and know nothing of facades.

**Tests at two levels:**

- **A smart component against fake facades**, rendering its real dumb children: what the operator
  sees, and which commands the facades receive. Dumb components are not tested on their own unless
  a behaviour cannot reasonably be reached through a smart component.
- **A feature from facade to HTTP**: the store-backed facade, its reducer and effects, and its HTTP
  adapter, against `HttpTestingController`. The api's answers, a 409 or a 400 or a failure, are
  turned into state here.

## Consequences

- Both frontends share one convention: a feature is a port, an adapter, state, effects and a
  facade.
- Dumb components can be split, merged or renamed without breaking a test (ADR 0006).
- The invitation form keeps its signal form for the address but no longer submits itself: it
  emits the address, and the facade's invitation status comes back as an input. Its refusal
  messages follow from state the effects set, tested at the feature level.
- `account-list.spec.ts` and `invite-vendor-form.spec.ts`, which test components directly over
  HTTP, give way to the page spec and the feature specs.
- Each feature takes more code than a component calling `HttpClient`: actions, a reducer, effects,
  a facade and its fake. Accepted for one convention across both apps.
- The store devtools cover the admin app's state as they do the vendor app's.

## Rejected

| Option | Why not |
|---|---|
| NgRx SignalStore behind the facades | Lighter and signal-native, but a new dependency and a second state model in the repo, for one small app |
| A home-rolled service holding signals | The least code, but unlike the vendor app inside, and it reinvents what effects give: cancellation, retries, ordering |
| Components keep calling `HttpClient` | The state the form and the list share would be wired through the page, and the api's outcomes would stay in components |
| Testing dumb components directly | Ties the tests to how the components are split; the smart component is the UI's public surface |
