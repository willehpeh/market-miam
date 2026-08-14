import { MarketDayView } from './market-days';

// The one Saturday every market-day spec stages. A field added to the view lands here
// once, not in a literal per spec file — slice 2's `closed` is the next arrival.
export const marketDayView = (overrides: Partial<MarketDayView> = {}): MarketDayView => ({
  scheduleId: 'schedule-1',
  marketId: 'market-1',
  date: '2026-08-15',
  day: 'SAT',
  startTime: '08:00',
  endTime: '13:00',
  absent: false,
  today: false,
  itemIds: [],
  market: { name: 'Marché de la Croix-Rousse', codePostal: '69004', town: 'Lyon' },
  ...overrides,
});
