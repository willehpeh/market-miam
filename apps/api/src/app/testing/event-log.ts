import { INestApplication } from '@nestjs/common';
import { Events, StoredEvent } from '@market-miam/event-sourcing';

// The whole log, for a spec to check what was recorded across streams (ADR 0064).
export class EventLog {
  constructor(private readonly app: INestApplication) {}

  async ofType(type: string): Promise<StoredEvent[]> {
    return (await this.app.get(Events).loadFrom(0, 100)).filter((event) => event.type === type);
  }
}
