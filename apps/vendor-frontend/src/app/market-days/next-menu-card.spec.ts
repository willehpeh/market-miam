import { fireEvent, render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { NextMenuCard } from './next-menu-card';
import { MarketDayFacade } from './market-day.facade';
import { FakeMarketDayFacade } from './fake.market-day.facade';
import { MarketDayView } from './market-days';
import { marketDayView as day } from './market-day-view.builder';

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

  it('counts the items once the day has a menu', async () => {
    await renderCard([day({ itemIds: ['item-1', 'item-2', 'item-3'] })]);

    expect(screen.getByText('3 plats au menu')).toBeTruthy();
    expect(screen.getByRole('link', { name: /modifier le menu/i })).toBeTruthy();
  });

  it('counts a single item in the singular', async () => {
    await renderCard([day({ itemIds: ['item-1'] })]);

    expect(screen.getByText('1 plat au menu')).toBeTruthy();
  });

  // Without this the card looks identical whether the vendor has not planned the day yet or
  // planned it and cleared it — and both are legal.
  it('says outright when the day carries no items', async () => {
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

  // The card is the switch (decisions 27, 41, 43): once the day is today and carries a
  // menu, the doorway leads to the live screen, not the planner — from midnight, so the
  // 6h sold-out case stays reachable.
  it('opens the live screen once the day is today and has a menu', async () => {
    await renderCard([day({ phase: 'due', itemIds: ['item-1'] })]);

    expect(screen.getByRole('link', { name: /suivre le marché/i }).getAttribute('href'))
      .toBe('/dashboard/live/market-1/2026-08-15');
  });

  // The flip is caused by planning, not by the clock — an unplanned today still opens
  // the editor, whose neutral prompt is what a vendor who forgot needs.
  it('keeps offering the planner while today has no menu', async () => {
    await renderCard([day({ phase: 'due' })]);

    expect(screen.getByRole('link', { name: /planifier le menu/i }).getAttribute('href'))
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

  // Decision 55: the vendor who wakes ill opens the app to the dashboard and wants to say
  // so — not to navigate through a button reading *Planifier le menu* to find it.
  it('offers the call-off on a today, planned or not', async () => {
    const { marketDays } = await renderCard([day({ phase: 'due' })]);

    fireEvent.click(screen.getByRole('button', { name: "Je ne peux pas venir aujourd'hui" }));

    expect(marketDays.closures).toEqual([{ marketId: 'market-1', date: '2026-08-15', closed: true }]);
  });

  it('keeps the call-off off a day that is not today', async () => {
    await renderCard([day({ itemIds: ['item-1'] })]);

    expect(screen.queryByRole('button', { name: "Je ne peux pas venir aujourd'hui" })).toBeNull();
  });

  // Decision 51: closed is read before items, or a closed menu-less day still reads
  // *Planifier le menu* and leads to a save decision 29 refuses.
  it('shows the closed state ahead of whatever the menu says', async () => {
    await renderCard([day({ phase: 'due', closed: true })]);

    expect(screen.getByText('Stand fermé')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rouvrir le stand' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /planifier le menu|suivre le marché/i })).toBeNull();
    expect(screen.queryByRole('button', { name: "Je ne peux pas venir aujourd'hui" })).toBeNull();
  });
});
