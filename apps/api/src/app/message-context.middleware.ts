import { Injectable, NestMiddleware } from '@nestjs/common';
import { MessageContextDispatcher } from '@market-monster/event-sourcing';

@Injectable()
export class MessageContextMiddleware implements NestMiddleware {
  constructor(private readonly dispatcher: MessageContextDispatcher) {}

  use(_req: unknown, _res: unknown, next: () => void): void {
    // Establish the root message context for this request, then let the rest
    // of the pipeline run inside it. Express invokes the downstream chain
    // synchronously via next(), so the AsyncLocalStorage scope propagates
    // through the controller and the command it dispatches.
    void this.dispatcher.dispatch(() => Promise.resolve(next()));
  }
}
