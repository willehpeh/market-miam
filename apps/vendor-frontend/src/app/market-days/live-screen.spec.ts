import { fireEvent, render, screen, waitFor, within } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { LiveScreen } from './live-screen';
import { MarketDayFacade } from './market-day.facade';
import { FakeMarketDayFacade } from './fake.market-day.facade';
import { marketDayView as day } from './market-day-view.builder';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { CatalogueItemView } from '../catalogue/catalogue';
import { catalogueItem } from '../catalogue/catalogue-item.builder';

const item = (itemId: string, name: string): CatalogueItemView => catalogueItem({ itemId, name });

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

  const aLiveDay = (marketDays: FakeMarketDayFacade, catalogue: FakeCatalogueFacade, soldOutItemIds: string[] = []) => {
    marketDays.days.set([day({ today: true, itemIds: ['item-1', 'item-2'], soldOutItemIds })]);
    catalogue.items.set([item('item-1', 'Bourguignon'), item('item-2', 'Tatin')]);
  };

  // Decision 7: marking is one fast tap on a full-width row, and the row moving into the
  // épuisé group is the receipt — no toast, no confirm.
  it('marks a dish sold out with one tap, the row moving as the receipt', async () => {
    const { marketDays } = await renderLive((md, cat) => aLiveDay(md, cat));

    fireEvent.click(screen.getByRole('button', { name: 'Bourguignon' }));

    expect(marketDays.availabilityChanges).toEqual([
      { marketId: 'market-1', date: '2026-08-15', itemId: 'item-1', soldOut: true },
    ]);
    const epuises = screen.getByRole('region', { name: /épuisé/i });
    expect(within(epuises).getByRole('button', { name: 'Bourguignon' })).toBeTruthy();
  });

  // Decision 7's undo: restore is a tap inside the épuisé group, not a toggle next to
  // the action it undoes.
  it('restores a dish with a tap inside the épuisé group', async () => {
    const { marketDays } = await renderLive((md, cat) => aLiveDay(md, cat, ['item-2']));

    fireEvent.click(within(screen.getByRole('region', { name: /épuisé/i })).getByRole('button', { name: 'Tatin' }));

    expect(marketDays.availabilityChanges).toEqual([
      { marketId: 'market-1', date: '2026-08-15', itemId: 'item-2', soldOut: false },
    ]);
    expect(screen.queryByRole('region', { name: /épuisé/i })).toBeNull();
  });

  it('splits the rows: sold-out dishes sit in the épuisé group, not the active list', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, ['item-1']));

    const epuises = screen.getByRole('region', { name: /épuisé/i });
    expect(within(epuises).getByRole('button', { name: 'Bourguignon' })).toBeTruthy();
    expect(within(epuises).queryByRole('button', { name: 'Tatin' })).toBeNull();
  });

  it('keeps the épuisé group off the screen while everything is available', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat));

    expect(screen.queryByRole('region', { name: /épuisé/i })).toBeNull();
  });

  // Decision 20: the page mutates under a screen reader with no visible cue it can read —
  // the move is announced, politely.
  it('announces the move', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat));

    fireEvent.click(screen.getByRole('button', { name: 'Bourguignon' }));
    expect(screen.getByText('Bourguignon épuisé')).toBeTruthy();

    fireEvent.click(within(screen.getByRole('region', { name: /épuisé/i })).getByRole('button', { name: 'Bourguignon' }));
    expect(screen.getByText('Bourguignon disponible')).toBeTruthy();
  });

  // Decision 27: a stated boundary, not a countdown — the screen re-asks the server
  // rather than computing when it stops being true.
  it('states when customers will see the menu, while waiting', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat));

    expect(screen.getByText(/vos clients verront ce menu à partir de 8h/i)).toBeTruthy();
    expect(screen.queryByText('En direct')).toBeNull();
  });

  // Decision 37: the banner's slot flips to the broadcast receipt — the one change on
  // this screen the vendor did not cause, which is why it must announce itself.
  it('flips the slot to the En direct receipt once the server says live', async () => {
    await renderLive((md, cat) => {
      md.days.set([day({ today: true, inProgress: true, itemIds: ['item-1', 'item-2'] })]);
      cat.items.set([item('item-1', 'Bourguignon'), item('item-2', 'Tatin')]);
    });

    expect(screen.getByText('En direct')).toBeTruthy();
    expect(screen.queryByText(/verront ce menu/i)).toBeNull();
  });

  // Neither claim is honest with an empty menu (decision 12): the customer page shows
  // its normal face either way.
  it('claims nothing while the menu is empty', async () => {
    await renderLive((md) => md.days.set([day({ today: true, inProgress: true })]));

    expect(screen.queryByText('En direct')).toBeNull();
    expect(screen.queryByText(/verront ce menu/i)).toBeNull();
  });

  // Decision 20: the tapped row's element is destroyed when it changes group, which
  // strands keyboard and switch-control focus — so focus follows the row.
  it('moves focus with the row it moved', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat));

    fireEvent.click(screen.getByRole('button', { name: 'Bourguignon' }));

    await waitFor(() =>
      expect(within(screen.getByRole('region', { name: /épuisé/i })).getByRole('button', { name: 'Bourguignon' })).toHaveFocus(),
    );
  });
});
