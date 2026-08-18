import { MarketDayView } from './market-days';

// The one Saturday every market-day spec stages. A field added to the view lands here
// once, not in a literal per spec file.
export const marketDayView = (overrides: Partial<MarketDayView> = {}): MarketDayView => ({
  scheduleId: 'schedule-1',
  marketId: 'market-1',
  date: '2026-08-15',
  day: 'SAT',
  startTime: '08:00',
  endTime: '13:00',
  absent: false,
  inProgress: false,
  today: false,
  closed: false,
  itemIds: [],
  soldOutItemIds: [],
  market: { name: 'Marché de la Croix-Rousse', codePostal: '69004', town: 'Lyon' },
  ...overrides,
});
