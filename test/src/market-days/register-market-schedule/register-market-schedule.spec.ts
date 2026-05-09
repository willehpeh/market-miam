import { InMemoryEventStore } from '../../in-memory.event-store';
import { EventStore } from '@market-monster/event-sourcing';

type RegisterMarketSchedule = {
  vendorId: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  directionsToStall?: string;
  days: {
    day: string;
    startTime?: string;
    endTime?: string;
  }[];
}

class RegisterMarketScheduleHandler {
  constructor(private readonly store: EventStore) {}
}

describe.skip('Register Market Schedule', () => {
  let store: InMemoryEventStore;
  let handler: RegisterMarketScheduleHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new RegisterMarketScheduleHandler(store);
  });

  it('should register a market schedule', () => {

  });
});
