# 0011. NestJS API with the @nestjs/cqrs command bus

Date: 2026-05-17 · Status: Accepted

## Context

The domain packages needed an HTTP host and a way to dispatch commands to
handlers. Options ranged from a minimal Express/Fastify app with hand-rolled
dispatch to a full framework with DI and an off-the-shelf command bus.

## Decision

Use NestJS for the API and `@nestjs/cqrs` for dispatch. Commands are plain
data classes extending `Command<void>`; handlers are decorated with
`@CommandHandler` and implement `ICommandHandler`, orchestrating value-object
construction, repository access, and aggregate behavior.

## Consequences

- DI, module wiring, and command routing come from the framework instead of
  bespoke plumbing; NestJS lifecycle hooks are available for subscription
  polling later.
- The domain packages take a deliberate, narrow dependency on `@nestjs/cqrs`
  base classes — accepted for now rather than wrapping the bus behind a port.
- Cross-cutting concerns (auth, logging, validation) get a standard home in
  the handler/controller layer.
- Queries will use the same bus's query side when the read surface is
  exposed over HTTP.
