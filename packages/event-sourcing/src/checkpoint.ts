export abstract class Checkpoint {
  protected constructor(readonly name: string) {}

  abstract read(): Promise<number>;
  abstract write(position: number): Promise<void>;
}
