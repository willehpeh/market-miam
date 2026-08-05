import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { MarketsList } from './markets-list';
import { MarketScheduleFacade } from './market-schedule.facade';
import { FakeMarketScheduleFacade } from './fake.market-schedule.facade';
import { MarketScheduleView } from './market-schedules';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';

async function renderList() {
  const view = await render(MarketsList, {
    providers: [
      provideRouter([]),
      { provide: MarketScheduleFacade, useClass: FakeMarketScheduleFacade },
      { provide: StorefrontFacade, useClass: FakeStorefrontFacade },
    ],
  });
  const markets = TestBed.inject(MarketScheduleFacade) as FakeMarketScheduleFacade;
  const storefront = TestBed.inject(StorefrontFacade) as FakeStorefrontFacade;
  return { view, markets, storefront };
}

const schedule = (overrides: Partial<MarketScheduleView> = {}): MarketScheduleView => ({
  scheduleId: 'schedule-1',
  marketId: 'market-1',
  market: { name: 'Marché de la Croix-Rousse', codePostal: '69004', town: 'Lyon' },
  startDate: '2026-07-15',
  days: [{ day: 'TUE', startTime: '08:00', endTime: '13:00' }],
  frequency: { weeks: 1 },
  ...overrides,
});

describe('MarketsList', () => {
  it('loads the schedules on init when the store is empty', async () => {
    const { markets } = await renderList();
    expect(markets.loaded).toBe(true);
  });

  it('does not reload when schedules are already in the store', async () => {
    const markets = new FakeMarketScheduleFacade();
    markets.schedules.set([schedule()]);
    await render(MarketsList, {
      providers: [
        provideRouter([]),
        { provide: MarketScheduleFacade, useValue: markets },
        { provide: StorefrontFacade, useClass: FakeStorefrontFacade },
      ],
    });

    expect(markets.loaded).toBe(false);
  });

  it('names each market', async () => {
    const { view, markets } = await renderList();
    markets.schedules.set([
      schedule(),
      schedule({ scheduleId: 'schedule-2', marketId: 'm2', market: { name: 'Marché Saint-Antoine', codePostal: '69002', town: 'Lyon' } }),
    ]);
    view.detectChanges();

    expect(screen.getByText('Marché de la Croix-Rousse')).toBeInTheDocument();
    expect(screen.getByText('Marché Saint-Antoine')).toBeInTheDocument();
  });

  it('shows the most recently added schedule first', async () => {
    const { view, markets } = await renderList();
    markets.schedules.set([schedule({ scheduleId: 'schedule-1' }), schedule({ scheduleId: 'schedule-2' })]);
    view.detectChanges();

    const editHrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href?.endsWith('/edit'));
    expect(editHrefs).toEqual(['/dashboard/markets/schedule-2/edit', '/dashboard/markets/schedule-1/edit']);
  });

  it('lists each day in French, ordered Monday first, with its time range', async () => {
    const { view, markets } = await renderList();
    markets.schedules.set([
      schedule({
        days: [
          { day: 'SUN', startTime: '08:00', endTime: '13:30' },
          { day: 'TUE', startTime: '08:00', endTime: '13:00' },
        ],
      }),
    ]);
    view.detectChanges();

    const days = screen.getAllByRole('term').map((el) => el.textContent);
    expect(days).toEqual(['Mardi', 'Dimanche']);
    expect(screen.getByText('8h – 13h')).toBeInTheDocument();
    expect(screen.getByText('8h – 13h30')).toBeInTheDocument();
  });

  it('labels a weekly cadence', async () => {
    const { view, markets } = await renderList();
    markets.schedules.set([schedule({ frequency: { weeks: 1 } })]);
    view.detectChanges();

    expect(screen.getByText('chaque semaine')).toBeInTheDocument();
  });

  it('labels a multi-week cadence', async () => {
    const { view, markets } = await renderList();
    markets.schedules.set([schedule({ frequency: { weeks: 2 } })]);
    view.detectChanges();

    expect(screen.getByText('toutes les 2 semaines')).toBeInTheDocument();
  });

  it('links each schedule card to its edit route', async () => {
    const { view, markets } = await renderList();
    markets.schedules.set([schedule()]);
    view.detectChanges();

    expect(screen.getByRole('link', { name: /marché de la croix-rousse/i })).toHaveAttribute(
      'href',
      '/dashboard/markets/schedule-1/edit',
    );
  });

  it('links the add button to the new-market route', async () => {
    await renderList();
    expect(screen.getByRole('link', { name: /ajouter/i })).toHaveAttribute('href', '/dashboard/markets/new');
  });

  // Which destination that is belongs to the storefront: see its own spec.
  it('returns wherever the storefront says pages beneath the vitrine go', async () => {
    const { view, storefront } = await renderList();
    storefront.backTo.set('/dashboard/storefront');
    view.detectChanges();

    expect(screen.getByRole('link', { name: /retour/i })).toHaveAttribute('href', '/dashboard/storefront');
  });

  it('shows only the add button when there are no schedules', async () => {
    await renderList();
    expect(screen.getByRole('link', { name: /ajouter/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour/i })).toBeInTheDocument();
  });

  it('says the calendar is empty when there are no schedules', async () => {
    await renderList();
    expect(screen.getByText(/calendrier est vide/i)).toBeInTheDocument();
  });

  it('drops the empty line once a market is scheduled', async () => {
    const { view, markets } = await renderList();
    markets.schedules.set([schedule()]);
    view.detectChanges();

    expect(screen.queryByText(/calendrier est vide/i)).toBeNull();
  });
});
