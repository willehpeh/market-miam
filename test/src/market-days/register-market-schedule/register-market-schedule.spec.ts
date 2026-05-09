import { InMemoryEventStore } from '../../in-memory.event-store';
import { TestRegisterMarketSchedule } from './test-data';
import { Calendars, MarketScheduleRegistered, RegisterMarketScheduleHandler } from '@market-monster/market-days';

describe('Register Market Schedule', () => {
  let store: InMemoryEventStore;
  let handler: RegisterMarketScheduleHandler;
  let calendars: Calendars;

  beforeEach(() => {
    store = new InMemoryEventStore();
    calendars = new Calendars(store);
    handler = new RegisterMarketScheduleHandler(calendars);
  });

  it.each([
    TestRegisterMarketSchedule.simple(),
    TestRegisterMarketSchedule.everyDay()
  ])('should register a market schedule, defaulting to weekly', async request => {
    await handler.handle(request);

    const expectedEvent: MarketScheduleRegistered = {
      type: "MarketScheduleRegistered",
      payload: {
        scheduleName: request.scheduleName,
        marketId: request.marketId,
        directionsToStall: request.directionsToStall,
        days: request.days,
        every: {
          weeks: 1
        }
      }
    };

    expect(store.allEvents()).toEqual([expect.objectContaining(expectedEvent)]);
  });
});
