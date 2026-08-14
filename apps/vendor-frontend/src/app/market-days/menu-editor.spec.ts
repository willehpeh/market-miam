import { fireEvent, render, screen } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MenuEditor } from './menu-editor';
import { MarketDayFacade } from './market-day.facade';
import { FakeMarketDayFacade } from './fake.market-day.facade';
import { marketDayView as day } from './market-day-view.builder';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { CatalogueItemView } from '../catalogue/catalogue';
import { catalogueItem } from '../catalogue/catalogue-item.builder';

const item = (itemId: string, name: string): CatalogueItemView => catalogueItem({ itemId, name });

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

  // Days can land before the carte: without gating on both, the editor briefly claims
  // "Votre carte est vide" while the catalogue is still on the wire.
  it('keeps waiting while the catalogue is still arriving', async () => {
    await renderEditor((marketDays, catalogue) => {
      marketDays.days.set([day()]);
      catalogue.loading.set(true);
    });

    expect(screen.getByRole('status', { name: /chargement/i })).toBeTruthy();
    expect(screen.queryByText(/votre carte est vide/i)).toBeNull();
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
      catalogue.items.set([item('item-1', 'Bourguignon'), item('item-2', 'Tatin')]);
    });

    expect(screen.getByRole('checkbox', { name: /Bourguignon/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Tatin/ })).toBeChecked();
  });

  it('saves the whole menu, not just what changed', async () => {
    const { marketDays } = await renderEditor((days, catalogue) => {
      days.days.set([day({ itemIds: ['item-2'] })]);
      catalogue.items.set([item('item-1', 'Bourguignon'), item('item-2', 'Tatin')]);
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
  it('clears the day when every item is unticked', async () => {
    const { marketDays } = await renderEditor((days, catalogue) => {
      days.days.set([day({ itemIds: ['item-1'] })]);
      catalogue.items.set([item('item-1', 'Bourguignon')]);
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
    const { catalogue } = await renderEditor((_, items) => items.items.set([item('item-1', 'Bourguignon')]));

    expect(catalogue.loaded).toBe(false);
  });
});
