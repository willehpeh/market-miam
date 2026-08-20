import { MarketDayOccurrence, MarketDayView } from '@market-miam/market-days';

// The two shapes the api specs assert whole: what `GET /market-days/upcoming` puts on the
// wire, and what the projection leaves in the read model.
//
// Typed as the real DTOs on purpose. These assertions exist to notice a payload changing,
// so a builder that quietly defaulted a new field would remove the very guard they are —
// but because the return types are the DTOs, adding a field to either breaks *here*, at
// compile time, and the field has to be stated once rather than hunted through specs.

export const occurrence = (overrides: Partial<MarketDayOccurrence> = {}): MarketDayOccurrence => ({
  scheduleId: 'schedule-1',
  marketId: 'market-1',
  date: '2026-07-21',
  day: 'TUE',
  startTime: '07:00',
  endTime: '14:30',
  absent: false,
  phase: 'future',
  nextPhaseInMs: undefined,
  items: [],
  closed: false,
  soldOutItemIds: [],
  outcomes: {},
  market: {
    name: 'Marché de Belleville',
    town: 'Paris',
    codePostal: '75011',
    streetAddress: 'Boulevard de Belleville',
    pitch: 'B12',
  },
  ...overrides,
});

export const projectedDay = (overrides: Partial<MarketDayView> = {}): MarketDayView => ({
  marketId: 'market-1',
  date: '2026-06-27',
  itemIds: [],
  soldOutItemIds: [],
  outcomes: {},
  closed: false,
  ...overrides,
});
