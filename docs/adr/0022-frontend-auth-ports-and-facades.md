# 0022. Frontend auth behind ports, NgRx bridge, component facades

Date: 2026-06-09 · Status: Accepted

## Context

The vendor frontend needs auth state (loading, authenticated user) in many
components. Components could inject the Auth0 SDK directly, but that couples
every component to one vendor's API, makes tests awkward, and scatters
session logic.

## Decision

Hexagonal layering in the frontend. An abstract `Auth` port exposes
behavior and Observables only (`login()`, `logout()`, `isLoading$()`,
`userId$()`); `Auth0Auth` implements it, with `FakeAuth` substituted in dev
mode. Functional NgRx effects bridge port to store, deriving session
actions (`LoginSuccess`/`LogoutSuccess`) from port streams. Components
depend only on `AuthFacade`, which exposes signals and dispatch methods —
never the port or store directly.

## Consequences

- Swapping or faking the identity provider touches one provider line;
  components and tests are unaffected.
- Session interpretation (e.g. "not loading + no user = logged out") lives
  in one effect, not in components.
- Auth state is in the store, so devtools/time-travel cover it like any
  other state.
- Each new external service repeats this port → effects → facade pattern;
  the layering is the convention, not a one-off.
