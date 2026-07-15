type CheckpointKind = 'projection' | 'processor';

type CheckpointMetadata = { name: string; kind: CheckpointKind };

const checkpoints = new WeakMap<object, CheckpointMetadata>();

// Marks an event handler for discovery by Subscriptions, carrying its
// durable checkpoint name — the subscription's resume key. Keep it stable:
// renaming orphans the old checkpoint and replays the handler from zero. The
// kind tells Subscriptions how to drive it: a processor dispatches commands, so it
// needs the continuation lineage wrapping and is not replay-safe.
export function CheckpointedProjection(checkpointName: string): ClassDecorator {
  return (target) => {
    checkpoints.set(target, { name: checkpointName, kind: 'projection' });
  };
}

export function CheckpointedProcessor(checkpointName: string): ClassDecorator {
  return (target) => {
    checkpoints.set(target, { name: checkpointName, kind: 'processor' });
  };
}

export function checkpointMetadata(target: object): CheckpointMetadata | undefined {
  return checkpoints.get(target);
}
