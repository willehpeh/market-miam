import { fireEvent, render, screen } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MenuEditor } from './menu-editor';
import { MarketDayFacade } from './market-day.facade';
import { FakeMarketDayFacade } from './fake.market-day.facade';
import { MarketDayView } from './market-days';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { CatalogueItemView } from '../catalogue/catalogue';

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

const dish = (itemId: string, name: string, price = 1300): CatalogueItemView => ({
  itemId,
  name,
  description: '',
  price,
  imageReference: '',
});

async function renderEditor(setup: (marketDays: FakeMarketDayFacade, catalogue: FakeCatalogueFacade) => void) {
  const marketDays = new FakeMarketDayFacade();
  const catalogue = new FakeCatalogueFacade();
  setup(marketDays, catalogue);
  const view = await render(MenuEditor, {
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

describe('MenuEditor', () => {
  it('waits while the days are still arriving', async () => {
    await renderEditor((marketDays) => marketDays.loading.set(true));

    expect(screen.getByRole('status', { name: /chargement/i })).toBeTruthy();
  });

  // A stale bookmark, or a schedule amended since. Saying so beats a silent bounce, and
  // there is no save button in this branch to wipe a menu with.
  it('says so when the day is no longer scheduled', async () => {
    await renderEditor((marketDays) => marketDays.days.set([day({ marketId: 'market-9' })]));

    expect(screen.getByText(/ce marché n.est plus programmé/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /enregistrer/i })).toBeNull();
  });

  it('names the day it is planning', async () => {
    await renderEditor((marketDays) => marketDays.days.set([day()]));

    expect(screen.getByRole('heading', { name: /samedi 15 août/i })).toBeTruthy();
    expect(screen.getByText(/Marché de la Croix-Rousse/)).toBeTruthy();
  });

  it('offers the whole catalogue, ticking what the day already carries', async () => {
    await renderEditor((marketDays, catalogue) => {
      marketDays.days.set([day({ itemIds: ['item-2'] })]);
      catalogue.items.set([dish('item-1', 'Bourguignon'), dish('item-2', 'Tatin')]);
    });

    expect(screen.getByRole('checkbox', { name: /Bourguignon/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Tatin/ })).toBeChecked();
  });

  it('saves the whole menu, not just what changed', async () => {
    const { marketDays } = await renderEditor((days, catalogue) => {
      days.days.set([day({ itemIds: ['item-2'] })]);
      catalogue.items.set([dish('item-1', 'Bourguignon'), dish('item-2', 'Tatin')]);
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /Bourguignon/ }));
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(marketDays.savedMenu).toEqual({
      marketId: 'market-1',
      date: '2026-08-15',
      itemIds: ['item-2', 'item-1'],
    });
  });

  // Clearing a day is an empty set, not a delete.
  it('clears the day when every dish is unticked', async () => {
    const { marketDays } = await renderEditor((days, catalogue) => {
      days.days.set([day({ itemIds: ['item-1'] })]);
      catalogue.items.set([dish('item-1', 'Bourguignon')]);
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /Bourguignon/ }));
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(marketDays.savedMenu).toEqual({ marketId: 'market-1', date: '2026-08-15', itemIds: [] });
  });

  it('loads the days and the catalogue it needs', async () => {
    const { marketDays, catalogue } = await renderEditor(() => undefined);

    expect(marketDays.loaded).toBe(true);
    expect(catalogue.loaded).toBe(true);
  });

  it('leaves a warm catalogue alone', async () => {
    const { catalogue } = await renderEditor((_, items) => items.items.set([dish('item-1', 'Bourguignon')]));

    expect(catalogue.loaded).toBe(false);
  });
});
