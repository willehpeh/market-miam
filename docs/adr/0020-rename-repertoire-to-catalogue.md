# 0020. Rename "Repertoire" to "Catalogue"

Date: 2026-06-08 · Status: Accepted

## Context

The vendor's collection of items was originally modelled as a "Repertoire".
The term never matched how the product describes itself — the product docs
and vendor-facing language say catalogue — and a domain model that doesn't
speak the ubiquitous language accumulates translation cost in every
conversation.

## Decision

Rename Repertoire to Catalogue throughout: aggregate, events
(`ItemAddedToCatalogue`), commands, projections, and read models. Done now,
while there are no production events — event type names are immutable once
real streams exist.

## Consequences

- Code, docs, and product language agree; no mental mapping required.
- The rename was only cheap because nothing is deployed; this is the
  precedent that language corrections happen immediately, before events
  fossilize.
- Any future renames after go-live will need event upcasting or mapping
  instead of a textual rename.
