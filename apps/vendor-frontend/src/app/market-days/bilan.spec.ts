import { fireEvent, render, screen, within } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Bilan } from './bilan';
import { MarketDayFacade } from './market-day.facade';
import { FakeMarketDayFacade } from './fake.market-day.facade';
import { marketDayView as day } from './market-day-view.builder';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { CatalogueItemView } from '../catalogue/catalogue';
import { catalogueItem } from '../catalogue/catalogue-item.builder';

const item = (itemId: string, name: string): CatalogueItemView => catalogueItem({ itemId, name });

const carte = [item('item-1', 'Bourguignon'), item('item-2', 'Rôti'), item('item-3', 'Tatin')];

async function renderBilan(setup: (marketDays: FakeMarketDayFacade, catalogue: FakeCatalogueFacade) => void) {
  const marketDays = new FakeMarketDayFacade();
  const catalogue = new FakeCatalogueFacade();
  setup(marketDays, catalogue);
  const view = await render(Bilan, {
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

const group = (dish: string) => within(screen.getByRole('group', { name: dish }));

const answer = (dish: string, verdict: string) => fireEvent.click(group(dish).getByRole('radio', { name: verdict }));

const chosen = (dish: string) =>
  group(dish)
    .getAllByRole('radio')
    .filter(radio => (radio as HTMLInputElement).checked)
    .map(radio => radio.closest('label')?.textContent?.trim());

const finish = () => fireEvent.click(screen.getByRole('button', { name: /terminer le bilan/i }));

describe('Bilan', () => {
  it('waits while the day is still arriving', async () => {
    await renderBilan(() => void 0);

    expect(screen.getByRole('status', { name: /chargement/i })).toBeTruthy();
  });

  // The live screen's own slot, read by a second screen (decision 70): one lazy-loaded
  // route, and no new data path for it to bring.
  it('asks for the one day it is judging', async () => {
    const { marketDays, catalogue } = await renderBilan(() => void 0);

    expect(marketDays.loadedDays).toEqual([{ marketId: 'market-1', date: '2026-08-15' }]);
    expect(catalogue.loaded).toBe(true);
  });

  // Decision 68: a flat list in catalogue order, one radio group per dish — no épuisés
  // split, and no reordering as the answers land.
  it("asks after the day's menu, in catalogue order", async () => {
    await renderBilan((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'past', itemIds: ['item-3', 'item-1'] }));
      catalogue.items.set(carte);
    });

    expect(screen.getAllByRole('group').map(each => each.querySelector('legend')?.textContent)).toEqual([
      'Bourguignon',
      'Tatin',
    ]);
    expect(group('Bourguignon').getAllByRole('radio')).toHaveLength(3);
  });

  // Decision 49: a vendor who marked four dishes during service arrives at four answered
  // and two left to judge.
  it('prefills épuisé for a dish marked sold out during service', async () => {
    await renderBilan((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'past', itemIds: ['item-1', 'item-2'], soldOutItemIds: ['item-1'] }));
      catalogue.items.set(carte);
    });

    expect(chosen('Bourguignon')).toEqual(['Épuisé']);
    expect(chosen('Rôti')).toEqual([]);
  });

  // A re-submit replaces, so a second sitting reads back what was recorded rather than
  // the service log the vendor already departed from once.
  it('reads back a bilan already recorded, over the sold-out mark', async () => {
    await renderBilan((marketDays, catalogue) => {
      marketDays.showing(
        day({
          phase: 'past',
          itemIds: ['item-1'],
          soldOutItemIds: ['item-1'],
          outcomes: { 'item-1': 'did_well' },
        }),
      );
      catalogue.items.set(carte);
    });

    expect(chosen('Bourguignon')).toEqual(['Bien vendu']);
  });

  // Decision 72: the bilan is submitted whole, prefilled rows included — the vendor who
  // marked one dish during service and judges the other submits both.
  it('submits the whole set, prefills included', async () => {
    const { marketDays } = await renderBilan((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'past', itemIds: ['item-1', 'item-2'], soldOutItemIds: ['item-1'] }));
      catalogue.items.set(carte);
    });

    answer('Rôti', 'Moins bien vendu');
    finish();

    expect(marketDays.recordedBilan).toEqual({
      marketId: 'market-1',
      date: '2026-08-15',
      outcomes: { 'item-1': 'sold_out', 'item-2': 'did_not_do_well' },
      complete: true,
    });
  });

  // Decision 71: the foot does not change on completion, so an unanswered row is a row
  // the submit leaves out rather than a button that will not fire.
  it('leaves an unanswered dish out of the set', async () => {
    const { marketDays } = await renderBilan((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'past', itemIds: ['item-1', 'item-2'] }));
      catalogue.items.set(carte);
    });

    answer('Bourguignon', 'Bien vendu');
    finish();

    expect(marketDays.recordedBilan?.outcomes).toEqual({ 'item-1': 'did_well' });
  });

  // The word the dashboard's prompt turns on: a bilan the vendor left half-answered is one
  // the unrated query is right to name again (decision 65), so it must not be reported as
  // whole and masked.
  it('says a half-answered bilan is not whole', async () => {
    const { marketDays } = await renderBilan((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'past', itemIds: ['item-1', 'item-2'] }));
      catalogue.items.set(carte);
    });

    answer('Bourguignon', 'Bien vendu');
    finish();

    expect(marketDays.recordedBilan?.complete).toBe(false);
  });

  // Why the screen is the one that says so, rather than the reducer counting stored ids: a
  // retired dish has no row to answer, and the query does not count it either — so a day
  // carrying one is whole when every row the vendor can see is answered.
  it('says a bilan is whole when the only dish left unanswered has left the catalogue', async () => {
    const { marketDays } = await renderBilan((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'past', itemIds: ['item-1', 'item-retired'] }));
      catalogue.items.set(carte);
    });

    answer('Bourguignon', 'Bien vendu');
    finish();

    expect(marketDays.recordedBilan?.complete).toBe(true);
  });

  it('keeps the last answer when the vendor changes their mind', async () => {
    const { marketDays } = await renderBilan((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'past', itemIds: ['item-1'], soldOutItemIds: ['item-1'] }));
      catalogue.items.set(carte);
    });

    answer('Bourguignon', 'Moins bien vendu');
    answer('Bourguignon', 'Bien vendu');
    finish();

    expect(marketDays.recordedBilan?.outcomes).toEqual({ 'item-1': 'did_well' });
  });

  // Decision 69: a bilan is about a finished day, so the screen declines what the domain
  // declines — a reactive branch, not a route guard (decision 71).
  it('declines a market that is still to come, and points at the live screen', async () => {
    await renderBilan((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'trading', itemIds: ['item-1'] }));
      catalogue.items.set(carte);
    });

    expect(screen.getByText(/pas encore terminé/i)).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.getByRole('link', { name: /en direct/i }).getAttribute('href')).toBe(
      '/dashboard/live/market-1/2026-08-15',
    );
  });

  // The live screen refuses any day but today, so a link to it from a February market
  // would be a door onto a refusal.
  it('sends the vendor back to the dashboard when there is no live screen to offer', async () => {
    await renderBilan((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'future', itemIds: ['item-1'] }));
      catalogue.items.set(carte);
    });

    expect(screen.getByText(/pas encore terminé/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /en direct/i })).toBeNull();
  });

  // Decision 75: a market called off before it opened never happened, so the screen
  // declines it — and says so in words that do not promise a bilan later.
  it('declines a market the vendor called off before it opened', async () => {
    await renderBilan((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'due', closed: true, calledOff: true, itemIds: ['item-1'] }));
      catalogue.items.set(carte);
    });

    expect(screen.getByText(/n'a pas eu lieu/i)).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
  });

  // A day the vendor closed is finished whatever the clock says (decision 69).
  it('judges a day the vendor called off before its hours ran out', async () => {
    await renderBilan((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'trading', closed: true, itemIds: ['item-1'] }));
      catalogue.items.set(carte);
    });

    expect(group('Bourguignon').getAllByRole('radio')).toHaveLength(3);
  });

  // Decision 71: the *je ne peux pas venir* close leaves a real day with nothing to
  // judge, and *ce marché n'a pas lieu* would be false.
  it('renders an empty bilan for a finished day that carried no menu', async () => {
    await renderBilan((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'past' }));
      catalogue.items.set(carte);
    });

    expect(screen.getByText(/aucun plat/i)).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
  });

  // A stale bookmark or a hand-typed URL, on the editor's precedent — the API answers 404
  // and the slot says missing.
  it('says so when the day is unknown', async () => {
    await renderBilan((marketDays) => marketDays.day.set({ status: 'missing' }));

    expect(screen.getByText(/n.est plus programmé/i)).toBeTruthy();
  });
});
