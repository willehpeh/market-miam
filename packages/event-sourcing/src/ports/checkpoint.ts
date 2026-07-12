export abstract class Checkpoint {
  abstract read(): Promise<number>;
  abstract write(position: number): Promise<void>;
}
