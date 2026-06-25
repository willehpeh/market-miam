const checkpointNames = new WeakMap<object, string>();

// Marks a Projection class for discovery by the consumer runner, carrying its
// durable checkpoint name — the subscription's resume key. Keep it stable:
// renaming orphans the old checkpoint and replays the projection from zero.
export function CheckpointedProjection(checkpointName: string): ClassDecorator {
  return (target) => {
    checkpointNames.set(target, checkpointName);
  };
}

export function projectionCheckpoint(target: object): string | undefined {
  return checkpointNames.get(target);
}
