import { INestApplication } from '@nestjs/common';
import { EventStore, StoredEvent } from '@market-miam/event-sourcing';

// A vendor as their stream records them, for a spec to check after a call (ADR 0064).
export class VendorOnRecord {
  constructor(
    private readonly app: INestApplication,
    readonly id: string,
  ) {}

  history(): Promise<StoredEvent[]> {
    return this.app.get(EventStore).load(`vendor-${this.id}`);
  }

  async recorded(type: string): Promise<StoredEvent | undefined> {
    return (await this.history()).find((event) => event.type === type);
  }
}
