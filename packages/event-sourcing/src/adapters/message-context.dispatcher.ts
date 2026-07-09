import { MessageContext } from '../ports/message-context';

export class MessageContextDispatcher {
  constructor(
    private readonly context: MessageContext,
    private readonly generateId: () => string,
  ) {}

  dispatch<T>(inner: () => Promise<T>): Promise<T> {
    const correlationId = this.generateId();
    const causationId = this.generateId();
    return this.context.run({ correlationId, causationId }, inner);
  }
}
