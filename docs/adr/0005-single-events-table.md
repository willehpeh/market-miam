# 0005. Single events table with stream and global positions

Date: 2026-05-01 · Status: Accepted

## Context

Event-sourced systems must choose how to lay out the log: one table per
aggregate type, one stream store per context, or a single unified table.
Projections also need a way to consume events across all streams in order,
not just per stream.

## Decision

Store all events in one `events` table — `stream_id`, `stream_type`,
`event_type`, `version`, `data` (jsonb), `timestamp` — in Postgres. Every
stored event carries two positions: `streamPosition` (per-stream version,
used for optimistic concurrency) and `globalPosition` (log-wide order, used
by subscriptions). The `EventStore` port serves stream-oriented reads and
appends; a separate `Events` port serves global reads (`loadFrom(position)`).

## Consequences

- Subscriptions and checkpoints work off a single monotonic global position;
  no merging across tables.
- New aggregate types need no schema work.
- Per-aggregate queries rely on indexing rather than physical separation;
  fine at this scale.
- Postgres sequence gaps under concurrent writers affect global-position
  consumers — handling is deferred (see DEFERRED.md).
