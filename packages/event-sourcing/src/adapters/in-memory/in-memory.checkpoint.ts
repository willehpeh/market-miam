import { Checkpoint } from '../../ports/checkpoint';
import { CheckpointConflictError } from '../../domain/checkpoint-conflict.error';

export class InMemoryCheckpoint implements Checkpoint {
  private position = 0;

  constructor(readonly name: string) {}

  read(): Promise<number> {
    return Promise.resolve(this.position);
  }

  advance(from: number, to: number): Promise<void> {
    if (this.position !== from) {
      return Promise.reject(new CheckpointConflictError(this.name, from));
    }
    this.position = to;
    return Promise.resolve();
  }

  reset(): Promise<void> {
    this.position = 0;
    return Promise.resolve();
  }
}
