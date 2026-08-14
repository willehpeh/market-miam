import { render, screen } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { LiveScreen } from './live-screen';
import { MarketDayFacade } from './market-day.facade';
import { FakeMarketDayFacade } from './fake.market-day.facade';
import { marketDayView as day } from './market-day-view.builder';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { CatalogueItemView } from '../catalogue/catalogue';

const item = (itemId: string, name: string): CatalogueItemView => ({
  itemId,
  name,
  description: '',
  price: 1300,
  imageReference: '',
});

async function renderLive(setup: (marketDays: FakeMarketDayFacade, catalogue: FakeCatalogueFacade) => void) {
  const marketDays = new FakeMarketDayFacade();
  const catalogue = new FakeCatalogueFacade();
  setup(marketDays, catalogue);
  const view = await render(LiveScreen, {
    providers: [
      provideRouter([]),
      { provide: MarketDayFacade, useValue: marketDays },
      { provide: CatalogueFacade, useValue: catalogue },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ marketId: 'market-1', date: '2026-08-15' }) } },
      },
    ],
  });
  return { view, marketDays, catalogue };
}

describe('LiveScreen', () => {
  it('waits while the days are still arriving', async () => {
    await renderLive((marketDays) => marketDays.loading.set(true));

    expect(screen.getByRole('status', { name: /chargement/i })).toBeTruthy();
  });

  it('names the day it is standing in', async () => {
    await renderLive((marketDays) => marketDays.days.set([day({ today: true })]));

    expect(screen.getByRole('heading', { name: /samedi 15 août/i })).toBeTruthy();
    expect(screen.getByText(/Marché de la Croix-Rousse/)).toBeTruthy();
  });

  // Unlike the editor, which offers the whole catalogue to tick, the live screen shows
  // only what the vendor brought — the rows are the day's menu, in catalogue order.
  it("lists the day's menu, not the whole catalogue", async () => {
    await renderLive((marketDays, catalogue) => {
      marketDays.days.set([day({ today: true, itemIds: ['item-3', 'item-1'] })]);
      catalogue.items.set([item('item-1', 'Bourguignon'), item('item-2', 'Rôti'), item('item-3', 'Tatin')]);
    });

    expect(screen.getByText('Bourguignon')).toBeTruthy();
    expect(screen.getByText('Tatin')).toBeTruthy();
    expect(screen.queryByText('Rôti')).toBeNull();
  });

  // Decision 41's guard state: the commands this screen fires are refused for any day
  // but today, so the screen refuses the same thing — a reactive branch, not a route guard.
  it('says so when the day is not today', async () => {
    await renderLive((marketDays) => marketDays.days.set([day({ today: false, itemIds: ['item-1'] })]));

    expect(screen.getByText(/ce marché n.a pas lieu aujourd.hui/i)).toBeTruthy();
    expect(screen.queryByText('Bourguignon')).toBeNull();
  });

  // A stale bookmark or a hand-typed URL — the editor's "n'est plus programmé" precedent.
  it('says so when the day is unknown', async () => {
    await renderLive((marketDays) => marketDays.days.set([day({ today: true, marketId: 'market-9' })]));

    expect(screen.getByText(/ce marché n.a pas lieu aujourd.hui/i)).toBeTruthy();
  });

  it('loads the days it needs', async () => {
    const { marketDays } = await renderLive(() => void 0);

    expect(marketDays.loaded).toBe(true);
  });
});
