import { AsyncLocalStorage } from 'node:async_hooks';

export type MessageContextData = {
  correlationId: string;
  causationId: string;
};

export class MessageContext {
  private readonly storage = new AsyncLocalStorage<MessageContextData>();

  run<T>(data: MessageContextData, fn: () => T): T {
    return this.storage.run(data, fn);
  }

  current(): MessageContextData | undefined {
    return this.storage.getStore();
  }
}
