# 0005. Single events table with stream and global positions

Date: 2026-05-01 · Status: Accepted · Amended 2026-07-04

## Context

Event-sourced systems must choose how to lay out the log: one table per
aggregate type, one stream store per context, or a single unified table.
Projections also need a way to consume events across all streams in order,
not just per stream.

## Decision

Store all events in one `events` table — `id`, `stream_id`, `stream_position`,
`event_type`, `payload` (jsonb), `metadata` (jsonb), `version`, `created_at`,
`global_position` — in Postgres. Every stored event carries two positions:
`stream_position` (per-stream version, optimistic concurrency) and
`global_position` (log-wide order, consumed by subscriptions). `version` is the
event's *schema* version — distinct from `stream_position` — carried on every
event for future payload evolution/upcasting. The `EventStore` port serves
stream-oriented reads and appends; a separate `Events` port serves global reads
(`loadFrom(position)`).

## Consequences

- Subscriptions and checkpoints work off a single monotonic global position;
  no merging across tables.
- New aggregate types need no schema work.
- Per-aggregate queries rely on indexing rather than physical separation;
  fine at this scale.
- Postgres sequence gaps under concurrent writers are prevented by serializing
  appends with a global advisory lock (ADR 0028).
- Amended 2026-07-04: dropped the never-used `stream_type` column and
  disambiguated `version` (event schema version) from `stream_position` (the
  per-stream version), matching `StoredEvent`.
