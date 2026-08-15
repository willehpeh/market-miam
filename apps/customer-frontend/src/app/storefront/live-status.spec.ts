import { broadcasting } from './live-status';
import { ItemViewModel, MarketViewModel, StorefrontViewModel } from './storefront-view-model';

const item = (itemId: string): ItemViewModel => ({
  itemId,
  name: 'Bœuf bourguignon',
  description: '',
  priceLabel: '13,00 €',
  photo: null,
});

const market = (overrides: Partial<MarketViewModel> = {}): MarketViewModel => ({
  weekday: 'SAM',
  day: '15',
  month: 'AOÛT',
  marketName: 'Marché de la Croix-Rousse',
  hours: '8h – 13h',
  address: 'Lyon',
  cancelled: false,
  inProgress: false,
  items: [],
  ...overrides,
});

const published = (upcomingMarkets: MarketViewModel[]): StorefrontViewModel => ({
  status: 'published',
  name: 'Acme',
  description: '',
  phone: '',
  coverUrl: null,
  socialImageUrl: null,
  items: [],
  upcomingMarkets,
});

describe('broadcasting — the poll and takeover gate (decision 26, slice-1 form)', () => {
  it('holds when the featured day is running with a menu', () => {
    expect(broadcasting(published([market({ inProgress: true, items: [item('item-1')] })]))).toBe(true);
  });

  it('does not hold before the market starts', () => {
    expect(broadcasting(published([market({ items: [item('item-1')] })]))).toBe(false);
  });

  it('does not hold over an empty menu — the page keeps its normal face', () => {
    expect(broadcasting(published([market({ inProgress: true })]))).toBe(false);
  });

  // The gate reads the featured day, the one the page leads with — a later market being
  // live is not this page's claim to make.
  it('reads only the featured day', () => {
    expect(broadcasting(published([market(), market({ inProgress: true, items: [item('item-1')] })]))).toBe(false);
  });

  it('never holds without a published storefront', () => {
    expect(broadcasting(null)).toBe(false);
    expect(broadcasting({ status: 'coming-soon', name: null })).toBe(false);
    expect(broadcasting(published([]))).toBe(false);
  });
});
