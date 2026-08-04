import { Projection } from './projection';
import { Processor } from './processor';

export type CheckpointKind = 'projection' | 'processor';

type CheckpointMetadata = { name: string; kind: CheckpointKind };

const checkpoints = new WeakMap<object, CheckpointMetadata>();

// Marks an event handler for discovery by Subscriptions, carrying its
// durable checkpoint name — the subscription's resume key. Keep it stable:
// renaming orphans the old checkpoint and replays the handler from zero. The
// kind tells Subscriptions how to drive it: a processor dispatches commands, so it
// needs the continuation lineage wrapping and is not replay-safe.
//
// The constrained signatures are load-bearing: only a class whose instances
// satisfy the kind's interface can carry the decorator, so metadata presence
// proves (at compile time) the shape Subscriptions later relies on — including
// the reset() a rebuild calls. The reverse guarantee — a class implementing the
// interface but missing its decorator — is the lint rule in eslint-rules/.
export function CheckpointedProjection(checkpointName: string) {
  return (target: new (...args: never[]) => Projection): void => {
    checkpoints.set(target, { name: checkpointName, kind: 'projection' });
  };
}

export function CheckpointedProcessor(checkpointName: string) {
  return (target: new (...args: never[]) => Processor): void => {
    checkpoints.set(target, { name: checkpointName, kind: 'processor' });
  };
}

export function checkpointMetadata(target: object): CheckpointMetadata | undefined {
  return checkpoints.get(target);
}
