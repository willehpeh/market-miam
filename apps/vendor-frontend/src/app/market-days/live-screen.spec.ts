import { fireEvent, render, screen, waitFor, within } from '@testing-library/angular';
import { vi } from 'vitest';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { LiveScreen } from './live-screen';
import { MarketDayFacade } from './market-day.facade';
import { FakeMarketDayFacade } from './fake.market-day.facade';
import { marketDayView as day } from './market-day-view.builder';
import { MarketDayView } from './market-days';
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
  it('waits while the day is still arriving', async () => {
    await renderLive(() => void 0);

    expect(screen.getByRole('status', { name: /chargement/i })).toBeTruthy();
  });

  it('names the day it is standing in', async () => {
    await renderLive((marketDays) => marketDays.showing(day({ phase: 'due' })));

    expect(screen.getByRole('heading', { name: /samedi 15 août/i })).toBeTruthy();
    expect(screen.getByText(/Marché de la Croix-Rousse/)).toBeTruthy();
  });

  // Unlike the editor, which offers the whole catalogue to tick, the live screen shows
  // only what the vendor brought — the rows are the day's menu, in catalogue order.
  it("lists the day's menu, not the whole catalogue", async () => {
    await renderLive((marketDays, catalogue) => {
      marketDays.showing(day({ phase: 'due', itemIds: ['item-3', 'item-1'] }));
      catalogue.items.set([item('item-1', 'Bourguignon'), item('item-2', 'Rôti'), item('item-3', 'Tatin')]);
    });

    expect(screen.getByText('Bourguignon')).toBeTruthy();
    expect(screen.getByText('Tatin')).toBeTruthy();
    expect(screen.queryByText('Rôti')).toBeNull();
  });

  // Decision 41's guard state: the commands this screen fires are refused for any day
  // but today, so the screen refuses the same thing — a reactive branch, not a route guard.
  it('says so when the day is not today', async () => {
    await renderLive((marketDays) => marketDays.showing(day({ phase: 'future', itemIds: ['item-1'] })));

    expect(screen.getByText(/ce marché n.a pas lieu aujourd.hui/i)).toBeTruthy();
    expect(screen.queryByText('Bourguignon')).toBeNull();
  });

  // A stale bookmark or a hand-typed URL — the editor's "n'est plus programmé" precedent.
  // The API answers 404 and the slot says missing, which lands in the same branch.
  it('says so when the day is unknown', async () => {
    await renderLive((marketDays) => marketDays.day.set({ status: 'missing' }));

    expect(screen.getByText(/ce marché n.a pas lieu aujourd.hui/i)).toBeTruthy();
  });

  // Decision 58: one day by id, never the 56-day window. The list drops a day at endTime,
  // which is mid-afternoon on the very screen the vendor ran the market on.
  it('asks for the one day it stands on, not the list', async () => {
    const { marketDays } = await renderLive(() => void 0);

    expect(marketDays.loadedDays).toEqual([{ marketId: 'market-1', date: '2026-08-15' }]);
    expect(marketDays.loaded).toBe(false);
  });

  const aLiveDay = (
    marketDays: FakeMarketDayFacade,
    catalogue: FakeCatalogueFacade,
    soldOutItemIds: string[] = [],
    overrides: Partial<MarketDayView> = {},
  ) => {
    marketDays.showing(day({ phase: 'due', itemIds: ['item-1', 'item-2'], soldOutItemIds, ...overrides }));
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
      md.showing(day({ phase: 'trading', itemIds: ['item-1', 'item-2'] }));
      cat.items.set([item('item-1', 'Bourguignon'), item('item-2', 'Tatin')]);
    });

    expect(screen.getByText('En direct')).toBeTruthy();
    expect(screen.queryByText(/verront ce menu/i)).toBeNull();
  });

  // Neither claim is honest with an empty menu (decision 12): the customer page shows
  // its normal face either way.
  it('claims nothing while the menu is empty', async () => {
    await renderLive((md) => md.showing(day({ phase: 'trading' })));

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

  // Decision 38: no confirm dialog — the placement is the mistap protection, at the foot
  // of the page, furthest from the rows tapped all morning.
  it('closes the stand with a tap at the foot', async () => {
    const { marketDays } = await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'trading' }));

    fireEvent.click(screen.getByRole('button', { name: 'Fermer le stand' }));

    expect(marketDays.closures).toEqual([{ marketId: 'market-1', date: '2026-08-15', closed: true }]);
  });

  // Decision 38: the closed screen is a full state, not a disabled one — the banner slot
  // says what the customer now sees, and Rouvrir sits exactly where Fermer stood.
  it('says the stand is closed and offers to reopen it', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'trading', closed: true }));

    expect(screen.getByText('Stand fermé')).toBeTruthy();
    expect(screen.getByText('Vos clients ne voient plus ce marché.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rouvrir le stand' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fermer le stand' })).toBeNull();
    expect(screen.queryByText('En direct')).toBeNull();
  });

  // Close is more reversible than sold-out (decision 38), so the door back is one tap in
  // the place the door out was — no confirm either.
  it('reopens the stand with a tap on Rouvrir', async () => {
    const { marketDays } = await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'trading', closed: true }));

    fireEvent.click(screen.getByRole('button', { name: 'Rouvrir le stand' }));

    expect(marketDays.closures).toEqual([{ marketId: 'market-1', date: '2026-08-15', closed: false }]);
  });

  // Decision 10: the editor must stay reachable during the market — *j'ai apporté une
  // plaque de plus* is real, and setMenu only ever guarded past days.
  it('keeps the editor reachable with a discreet link', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'trading' }));

    expect(screen.getByRole('link', { name: 'Modifier le menu' }).getAttribute('href')).toBe(
      '/dashboard/menus/market-1/2026-08-15',
    );
  });

  // Decision 38: the closed screen is a full state, not a disabled one. Decision 29 makes
  // the domain refuse setMenu once the stand is shut, so a link still offering it would
  // buy the vendor a 400 on the first mistap.
  it('takes the editor link away once the stand is closed', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'trading', closed: true }));

    expect(screen.queryByRole('link', { name: 'Modifier le menu' })).toBeNull();
  });

  // Decision 63: the screen stops offering the editor once the market is over, while the
  // domain keeps accepting the edit — the same split decision 60 makes for the rows one
  // line above. A menu edited at 15h rewrites the set 2b is about to ask the vendor to
  // judge, and nothing on this screen should invite that.
  it('takes the editor link away once the market is over', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'over' }));

    expect(screen.queryByRole('link', { name: 'Modifier le menu' })).toBeNull();
  });

  // Decision 48: inert means the rows stop being availability controls, not that they stop
  // being rows — they keep their markup and both groups keep their split, which is what
  // decision 70 left standing when the bilan took its own route. Asserted as disabled rather than by clicking: fireEvent
  // dispatches straight to the listener, where a browser suppresses activation entirely.
  it('stops the rows being availability controls once the stand is closed', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, ['item-2'], { phase: 'trading', closed: true }));

    expect(screen.getByRole('button', { name: 'Bourguignon' })).toBeDisabled();
    expect(within(screen.getByRole('region', { name: /épuisé/i })).getByRole('button', { name: 'Tatin' })).toBeDisabled();
  });

  // Decision 59: one timer off the server-said duration, not a 60s interval. The screen
  // asks again exactly when the phase it is showing has run out — the timer decides when
  // to ask, never what the answer is, so firing late is self-correcting.
  describe('asking again when the phase turns over', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('re-asks when the countdown runs out', async () => {
      const { marketDays } = await renderLive((md, cat) =>
        aLiveDay(md, cat, [], { phase: 'due', nextPhaseInMs: 60_000 }));

      vi.advanceTimersByTime(60_000);

      expect(marketDays.loadedDays).toHaveLength(2);
    });

    it('waits for the whole countdown, and a tap in the meantime does not restart it', async () => {
      const { marketDays } = await renderLive((md, cat) =>
        aLiveDay(md, cat, [], { phase: 'trading', nextPhaseInMs: 60_000 }));

      vi.advanceTimersByTime(30_000);
      fireEvent.click(screen.getByRole('button', { name: 'Bourguignon' }));
      vi.advanceTimersByTime(30_000);

      expect(marketDays.loadedDays).toHaveLength(2);
    });

    // Decision 61: nothing follows `past`, so there is nothing to wait for.
    it('sets no timer on a day that carries no countdown', async () => {
      const { marketDays } = await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'over' }));

      vi.advanceTimersByTime(24 * 60 * 60_000);

      expect(marketDays.loadedDays).toHaveLength(1);
    });
  });

  // A backgrounded phone fires no timer, which is what this is for: the vendor puts the
  // phone in their apron at 11h and takes it out at 13h30.
  it('asks again when the tab comes back', async () => {
    const { marketDays } = await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'trading' }));

    document.dispatchEvent(new Event('visibilitychange'));

    expect(marketDays.loadedDays).toHaveLength(2);
  });

  // Decision 60: `over` is a full state, not the else-branch of the foot. Before the point
  // lookup an ended day could not reach this screen at all; now it stays open on it all
  // afternoon, and the foot would otherwise offer *je ne peux pas venir* at 13h05 to a
  // vendor who traded all morning.
  it('says the market is over once the clock has ended it', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'over' }));

    expect(screen.getByText('Marché terminé')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fermer le stand' })).toBeNull();
    expect(screen.queryByRole('button', { name: /je ne peux pas venir/i })).toBeNull();
  });

  // Decision 48's treatment, for the same reason one phase later: *épuisé* is a claim
  // about a stall that is no longer there, and decision 49 reads these marks back as a
  // rating. The rows stay rows; the bilan is a link at the foot, not a mode on them.
  it('stops the rows being availability controls once the market is over', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, ['item-2'], { phase: 'over' }));

    expect(screen.getByRole('button', { name: 'Bourguignon' })).toBeDisabled();
    expect(within(screen.getByRole('region', { name: /épuisé/i })).getByRole('button', { name: 'Tatin' })).toBeDisabled();
  });

  // Decision 70: the bilan took its own route, so the foot decision 60 left empty carries
  // the door to it rather than the rating itself.
  it('offers the bilan once the market is over', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'over' }));

    expect(screen.getByRole('link', { name: 'Faire le bilan' }).getAttribute('href')).toBe(
      '/dashboard/bilan/market-1/2026-08-15',
    );
  });

  // A closed day is finished whatever the clock says (decision 69), so the vendor who
  // packed up at 11h can judge the morning without waiting for endTime.
  it('offers the bilan on a stand the vendor closed early', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'trading', closed: true }));

    expect(screen.getByRole('link', { name: 'Faire le bilan' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rouvrir le stand' })).toBeTruthy();
  });

  // The domain refuses a bilan for a day still being traded, and the screen declines the
  // same thing rather than offering a door onto a refusal.
  it('offers no bilan while the stand is still open', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'trading' }));

    expect(screen.queryByRole('link', { name: 'Faire le bilan' })).toBeNull();
  });

  // A live defect the moment `over` can reach the screen: decision 50 makes reopen raise
  // MarketDayEndedError past endTime, and the failure path is a silent snap-back — a
  // button that does nothing.
  it('offers no reopen once the clock has ended the day', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'over', closed: true }));

    expect(screen.queryByRole('button', { name: 'Rouvrir le stand' })).toBeNull();
  });

  // Decision 52: the verb flips at startTime because a door is an offer, not a record —
  // *je ne peux pas venir* is what the vendor means at 7h, *fermer le stand* at 9h.
  it('offers the call-off before the market starts', async () => {
    const { marketDays } = await renderLive((md, cat) => aLiveDay(md, cat));

    fireEvent.click(screen.getByRole('button', { name: "Je ne peux pas venir aujourd'hui" }));

    expect(marketDays.closures).toEqual([{ marketId: 'market-1', date: '2026-08-15', closed: true }]);
    expect(screen.queryByRole('button', { name: 'Fermer le stand' })).toBeNull();
  });

  it('swaps the verb for Fermer le stand once the market is running', async () => {
    await renderLive((md, cat) => aLiveDay(md, cat, [], { phase: 'trading' }));

    expect(screen.getByRole('button', { name: 'Fermer le stand' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /je ne peux pas venir/i })).toBeNull();
  });

  // The door is gated on today, not on a menu: decision 16's guard is *today*, and an empty
  // menu makes the sentence no less true. The banner is the half that needs a menu.
  it('offers the call-off with no menu at all', async () => {
    await renderLive((md) => md.showing(day({ phase: 'due' })));

    expect(screen.getByRole('button', { name: "Je ne peux pas venir aujourd'hui" })).toBeTruthy();
    expect(screen.queryByText(/verront ce menu/i)).toBeNull();
  });
});
