import { EventHandler } from '../ports/event-handler';

// A marker for the semantic half of ADR 0015 that the type system can't carry: a
// processor dispatches commands, so it is not replay-safe. Structurally identical to
// EventHandler — what Subscriptions actually reads is the @CheckpointedProcessor
// metadata, and the lint rule in eslint-rules/ catches a Processor that forgot it.
export type Processor = EventHandler;
