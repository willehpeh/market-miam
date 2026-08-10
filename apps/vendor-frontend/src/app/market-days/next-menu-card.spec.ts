import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { NextMenuCard } from './next-menu-card';
import { MarketDayFacade } from './market-day.facade';
import { FakeMarketDayFacade } from './fake.market-day.facade';
import { MarketDayView } from './market-days';

const day = (overrides: Partial<MarketDayView> = {}): MarketDayView => ({
  scheduleId: 'schedule-1',
  marketId: 'market-1',
  date: '2026-08-15',
  day: 'SAT',
  startTime: '08:00',
  endTime: '13:00',
  absent: false,
  itemIds: [],
  market: { name: 'Marché de la Croix-Rousse', codePostal: '69004', town: 'Lyon' },
  ...overrides,
});

async function renderCard(days: MarketDayView[]) {
  const marketDays = new FakeMarketDayFacade();
  marketDays.days.set(days);
  const view = await render(NextMenuCard, {
    providers: [provideRouter([]), { provide: MarketDayFacade, useValue: marketDays }],
  });
  return { view, marketDays };
}

describe('NextMenuCard', () => {
  it('names the next market day, with the hours a vendor plans quantities around', async () => {
    await renderCard([day()]);

    expect(screen.getByRole('heading', { name: /prochain marché/i })).toBeTruthy();
    expect(screen.getByText(/samedi 15 août/i)).toBeTruthy();
    expect(screen.getByText(/Marché de la Croix-Rousse/)).toBeTruthy();
    expect(screen.getByText('8h – 13h')).toBeTruthy();
  });

  it('counts the dishes once the day has a menu', async () => {
    await renderCard([day({ itemIds: ['item-1', 'item-2', 'item-3'] })]);

    expect(screen.getByText('3 plats au menu')).toBeTruthy();
    expect(screen.getByRole('link', { name: /modifier le menu/i })).toBeTruthy();
  });

  it('counts a single dish in the singular', async () => {
    await renderCard([day({ itemIds: ['item-1'] })]);

    expect(screen.getByText('1 plat au menu')).toBeTruthy();
  });

  // Without this the card looks identical whether the vendor has not planned the day yet or
  // planned it and cleared it — and both are legal.
  it('says outright when the day carries no dishes', async () => {
    await renderCard([day()]);

    expect(screen.getByText('Aucun plat au menu')).toBeTruthy();
    expect(screen.getByRole('link', { name: /planifier le menu/i })).toBeTruthy();
  });

  // A day the vendor has declared themselves away from cannot carry a menu — the query
  // suppresses it — so offering to plan one would be a save that renders nowhere.
  it('skips a day the vendor is absent for', async () => {
    await renderCard([day({ absent: true }), day({ marketId: 'market-2', date: '2026-08-22', day: 'SAT' })]);

    expect(screen.getByText(/samedi 22 août/i)).toBeTruthy();
  });

  // The horizon is named because the endpoint sees 56 days: a vendor on a longer cadence
  // has a market this card cannot know about, and "aucun marché" alone would be a lie.
  it('warns when no market day is in reach', async () => {
    await renderCard([]);

    expect(screen.getByText(/aucun marché dans les 8 prochaines semaines/i)).toBeTruthy();
  });

  it('opens the day it names', async () => {
    await renderCard([day()]);

    expect(screen.getByRole('link', { name: /le menu/i }).getAttribute('href'))
      .toBe('/dashboard/menus/market-1/2026-08-15');
  });

  it('offers nothing to plan when there is no market day', async () => {
    await renderCard([]);

    expect(screen.queryByRole('link', { name: /le menu/i })).toBeNull();
  });

  it('loads the days it needs', async () => {
    const { marketDays } = await renderCard([]);

    expect(marketDays.loaded).toBe(true);
  });
});
