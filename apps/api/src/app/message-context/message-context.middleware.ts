import { Injectable, NestMiddleware } from '@nestjs/common';
import { MessageContextDispatcher } from '@market-miam/event-sourcing';

@Injectable()
export class MessageContextMiddleware implements NestMiddleware {
  constructor(private readonly dispatcher: MessageContextDispatcher) {}

  use(_req: unknown, _res: unknown, next: () => void): void {
    this.dispatcher.dispatch(next);
  }
}
