import { Injectable, NestMiddleware } from '@nestjs/common';
import { LineageDispatcher } from '@market-miam/event-sourcing';

@Injectable()
export class LineageMiddleware implements NestMiddleware {
  constructor(private readonly dispatcher: LineageDispatcher) {}

  use(_req: unknown, _res: unknown, next: () => void): void {
    this.dispatcher.dispatch(next);
  }
}
