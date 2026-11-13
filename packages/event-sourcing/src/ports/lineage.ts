import { AsyncLocalStorage } from 'node:async_hooks';

export type LineageIds = {
  correlationId: string;
  causationId: string;
  // The operator whose request started the chain, on operator routes only.
  operatorId?: string;
};

export class Lineage {
  private readonly storage = new AsyncLocalStorage<LineageIds>();

  run<T>(data: LineageIds, fn: () => T): T {
    return this.storage.run(data, fn);
  }

  current(): LineageIds | undefined {
    return this.storage.getStore();
  }
}
