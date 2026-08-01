export class CheckpointConflictError extends Error {
  constructor(subscriptionName: string, expectedPosition: number) {
    super(`Checkpoint '${subscriptionName}' is no longer at ${expectedPosition}: a concurrent writer moved it`);
    this.name = 'CheckpointConflictError';
  }
}
