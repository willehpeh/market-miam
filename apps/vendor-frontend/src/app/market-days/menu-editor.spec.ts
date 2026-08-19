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


  // Two doorways in (decision 10, and decision 51's unplanned today), so backing out goes
  // where the card would send them now rather than always to the dashboard.
  it('backs out to the live screen when the day is a planned today', async () => {
    await renderEditor((marketDays) => marketDays.days.set([day({ today: true, itemIds: ['item-1'] })]));

    expect(screen.getByRole('link', { name: /retour/i }).getAttribute('href')).toBe(
      '/dashboard/live/market-1/2026-08-15',
    );
  });

  it('backs out to the dashboard when the day has no live screen to go back to', async () => {
    await renderEditor((marketDays) => marketDays.days.set([day({ today: true })]));

    expect(screen.getByRole('link', { name: /retour/i }).getAttribute('href')).toBe('/dashboard');
  });

  // Decision 53: browser-back after closing is one gesture, and a hand-typed URL lands the
  // same way — a normal editor would offer an Enregistrer decision 29 refuses in silence.
  it('renders the closed state in place of the list', async () => {
    await renderEditor((md, cat) => {
      md.days.set([day({ today: true, closed: true })]);
      cat.items.set([item('item-1', 'Bourguignon')]);
    });

    expect(screen.getByText('Stand fermé')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).toBeNull();
    expect(screen.queryByText('Bourguignon')).toBeNull();
  });

  // Decision 53: the undo is one tap where the state renders, not a link to somewhere it
  // renders better — this is the path of the tap nobody meant.
  it('reopens the stand from the editor', async () => {
    const { marketDays } = await renderEditor((md) => md.days.set([day({ today: true, closed: true })]));

    fireEvent.click(screen.getByRole('button', { name: 'Rouvrir le stand' }));

    expect(marketDays.closures).toEqual([{ marketId: 'market-1', date: '2026-08-15', closed: false }]);
  });
});
