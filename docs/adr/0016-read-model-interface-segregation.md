# 0016. Read models split into write and read surfaces

Date: 2026-06-06 · Status: Accepted

## Context

A read model has two clients with different needs: the projection that
maintains it and the queries that consume it. A single interface serving
both would let query code reach mutation methods (and vice versa), and would
grow into a grab-bag as either side evolves.

## Decision

Each read model gets two ports. The write surface (`CatalogueViewStore`:
`addItemToCatalogue`, `updateItemPrice`, `clear`) is used only by the
projection; the read surface (`CatalogueViews`: `forVendor`) is used only by
queries. One adapter may implement both, but consumers depend on exactly the
surface they need.

## Consequences

- Query-side code cannot mutate views; projection code cannot grow query
  features.
- `clear()` lives on the write surface, supporting the rebuild strategy
  (clear + reset checkpoint + replay — DEFERRED.md).
- Each new read model adds two small interfaces instead of one growing one;
  the in-memory fake implements both in one class.
