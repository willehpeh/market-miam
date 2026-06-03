import { RepertoireViews } from './repertoire-views';
import { Projection, StoredEvent } from '@market-monster/event-sourcing';

export class RepertoireViewProjection implements Projection {
  handle(event: StoredEvent): void | Promise<void> {
    return undefined;
  }
  constructor(private readonly views: RepertoireViews) {
  }
}
