import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  Calendars,
  Catalogues,
  MarketScheduleRegistered,
  MismatchedPricingError,
  NoSuchItemError,
  UnscheduledMarketError,
  SetMarketPricesHandler,
  VendorScopedEvents
} from '@market-miam/market-days';
import { InvalidPriceError } from '@market-miam/market-days';
import { EmptyValueError } from '@market-miam/common';
import { seedCatalogue } from '../../seed-catalogue';
import { TestSetMarketPrices } from './test-data';

// market-1 is a market this vendor actually stands at: pricing is refused for one they
// do not schedule, so every arrangement here starts from a real schedule. Seeded rather
// than registered through the handler, so `newEvents()` carries only what the spec caused.
function seedSchedule(store: InMemoryEventStore) {
  const registered: MarketScheduleRegistered = {
    type: 'MarketScheduleRegistered',
    payload: {
      market: { id: 'market-1', name: 'Marché', codePostal: '75011', town: 'Paris' },
      scheduleId: 'schedule-1',
      startDate: '2026-06-01',
      days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }],
      frequency: { weeks: 1 },
    },
    version: 1,
  };
  store.seedWith('calendar-vendor-1', [registered], { vendorId: 'vendor-1' });
}

describe('Set Market Prices', () => {
  let store: InMemoryEventStore;
  let handler: SetMarketPricesHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    const events = new VendorScopedEvents(store);
    seedCatalogue(store, 'vendor-1', 'item-1', 'item-2', {
      itemId: 'pizza',
      variants: [
        { name: 'Margherita', description: '', price: 900 },
        { name: 'Pepperoni', description: 'spicy', price: 1200 },
      ],
    });
    seedSchedule(store);
    handler = new SetMarketPricesHandler(new Calendars(events), new Catalogues(events));
  });

  it('sets a price for a dish at a market', async () => {
    await handler.execute(TestSetMarketPrices.valid());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketPricesSet',
        payload: { marketId: 'market-1', prices: { 'item-1': 1200 } },
      }),
    ]);
  });

  it('sets a price for each variant of a dish at a market', async () => {
    const command = TestSetMarketPrices.with({ prices: { pizza: { Margherita: 1100, Pepperoni: 1400 } } });

    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketPricesSet',
        payload: { marketId: 'market-1', prices: { pizza: { Margherita: 1100, Pepperoni: 1400 } } },
      }),
    ]);
  });

  it('raises nothing when the prices are unchanged', async () => {
    await handler.execute(TestSetMarketPrices.valid());

    await handler.execute(TestSetMarketPrices.valid());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketPricesSet',
        payload: { marketId: 'market-1', prices: { 'item-1': 1200 } },
      }),
    ]);
  });

  // A fresh command with equal content, not the same object twice: what must not raise is
  // a repriced-to-the-same-thing submission, whatever object carried it.
  it('raises nothing when the variant prices are unchanged', async () => {
    const prices = () => ({ pizza: { Margherita: 1100, Pepperoni: 1400 } });
    await handler.execute(TestSetMarketPrices.with({ prices: prices() }));

    await handler.execute(TestSetMarketPrices.with({ prices: prices() }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketPricesSet',
        payload: { marketId: 'market-1', prices: { pizza: { Margherita: 1100, Pepperoni: 1400 } } },
      }),
    ]);
  });

  // The write-side proof that a market's prices are replaced, not merged: if the second
  // list had merged into the first, the third submission would differ from what the day
  // holds and would raise.
  it('compares against the list that replaced the last one, not a merge of both', async () => {
    await handler.execute(TestSetMarketPrices.valid());
    await handler.execute(TestSetMarketPrices.with({ prices: { 'item-2': 900 } }));

    await handler.execute(TestSetMarketPrices.with({ prices: { 'item-2': 900 } }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketPricesSet',
        payload: { marketId: 'market-1', prices: { 'item-1': 1200 } },
      }),
      expect.objectContaining({
        type: 'MarketPricesSet',
        payload: { marketId: 'market-1', prices: { 'item-2': 900 } },
      }),
    ]);
  });

  it('clears the market with an empty list', async () => {
    await handler.execute(TestSetMarketPrices.valid());

    await handler.execute(TestSetMarketPrices.with({ prices: {} }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketPricesSet',
        payload: { marketId: 'market-1', prices: { 'item-1': 1200 } },
      }),
      expect.objectContaining({
        type: 'MarketPricesSet',
        payload: { marketId: 'market-1', prices: {} },
      }),
    ]);
  });

  // Clearing what was never set is not a change — the market has always been sold at
  // catalogue prices, and saying so again is not news the log needs.
  it('raises nothing when clearing a market that was never priced', async () => {
    await handler.execute(TestSetMarketPrices.with({ prices: {} }));

    expect(store.newEvents()).toEqual([]);
  });

  it('rejects a dish that is not in the catalogue', async () => {
    const command = TestSetMarketPrices.with({ prices: { 'not-in-catalogue': 1200 } });

    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
    expect(store.newEvents()).toEqual([]);
  });

  it('rejects a market the vendor does not schedule', async () => {
    const command = TestSetMarketPrices.with({ marketId: 'market-2' });

    await expect(() => handler.execute(command)).rejects.toThrow(UnscheduledMarketError);
    expect(store.newEvents()).toEqual([]);
  });

  it('rejects one price for a dish sold by variant', async () => {
    const command = TestSetMarketPrices.with({ prices: { pizza: 1200 } });

    await expect(() => handler.execute(command)).rejects.toThrow(MismatchedPricingError);
    expect(store.newEvents()).toEqual([]);
  });

  it('rejects prices per variant for a flat-priced dish', async () => {
    const command = TestSetMarketPrices.with({ prices: { 'item-1': { Grande: 1200 } } });

    await expect(() => handler.execute(command)).rejects.toThrow(MismatchedPricingError);
    expect(store.newEvents()).toEqual([]);
  });

  it('rejects a variant the dish does not have', async () => {
    const command = TestSetMarketPrices.with({ prices: { pizza: { Calzone: 1400 } } });

    await expect(() => handler.execute(command)).rejects.toThrow(MismatchedPricingError);
    expect(store.newEvents()).toEqual([]);
  });

  // Sparse is the whole point: Pepperoni costs more here, Margherita is unchanged and
  // keeps its catalogue price. Naming every variant must not be required.
  it('accepts a price for only some of a dish\'s variants', async () => {
    const command = TestSetMarketPrices.with({ prices: { pizza: { Pepperoni: 1400 } } });

    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketPricesSet',
        payload: { marketId: 'market-1', prices: { pizza: { Pepperoni: 1400 } } },
      }),
    ]);
  });

  it.each([
    -1,
    12.5,
  ])('rejects a price that is not whole cents: %s', async (price) => {
    const command = TestSetMarketPrices.with({ prices: { 'item-1': price } });

    await expect(() => handler.execute(command)).rejects.toThrow(InvalidPriceError);
    expect(store.newEvents()).toEqual([]);
  });

  it.each([
    '',
    '   ',
  ])('rejects an empty variant name: "%s"', async (name) => {
    const command = TestSetMarketPrices.with({ prices: { pizza: { [name]: 1400 } } });

    await expect(() => handler.execute(command)).rejects.toThrow(EmptyValueError);
    expect(store.newEvents()).toEqual([]);
  });

  // A persisted address, not an implementation detail: once vendors have priced a market,
  // an edit here orphans every stream they wrote.
  it('addresses the prices to the vendor\'s calendar', async () => {
    await handler.execute(TestSetMarketPrices.valid());

    expect(store.newEvents().map(event => event.streamId)).toEqual(['calendar-vendor-1']);
  });

  // Naming a dish but overriding none of its variants says what saying nothing says: the
  // dish sells at catalogue prices. A picker that lets a vendor select Pizza and type
  // nothing must not put that in the log.
  it('raises nothing for a dish whose variants are all left at catalogue prices', async () => {
    const command = TestSetMarketPrices.with({ prices: { pizza: {} } });

    await handler.execute(command);

    expect(store.newEvents()).toEqual([]);
  });

  it('drops an unoverridden dish from a list that prices others', async () => {
    const command = TestSetMarketPrices.with({ prices: { 'item-1': 1200, pizza: {} } });

    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketPricesSet',
        payload: { marketId: 'market-1', prices: { 'item-1': 1200 } },
      }),
    ]);
  });
});
