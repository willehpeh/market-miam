import { Checkpoint } from 'packages/event-sourcing/src';

export class InMemoryCheckpoint implements Checkpoint {
  private position = 0;

  constructor(readonly name: string) {}

  read(): Promise<number> {
    return Promise.resolve(this.position);
  }

  write(position: number): Promise<void> {
    this.position = position;
    return Promise.resolve();
  }
}
