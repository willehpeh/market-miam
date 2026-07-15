import { MessageContext } from '../ports/message-context';

export class MessageContextDispatcher {
  constructor(
    private readonly context: MessageContext,
    private readonly generateId: () => string,
  ) {}

  dispatch<T>(inner: () => T): T {
    const rootId = this.generateId();
    return this.context.run({ correlationId: rootId, causationId: rootId }, inner);
  }
}
