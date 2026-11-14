import { screen, waitFor } from '@testing-library/angular';
import { vi } from 'vitest';
import { LiveScreenPageObject } from './live-screen.page-object';
import { FakeMarketDayFacade } from '../fake.market-day.facade';
import { testMarketDayView as day } from '../test-market-day-view.builder';
import { MarketDayView } from '../market-days';
import { FakeCatalogueFacade } from '../../catalogue/fake.catalogue.facade';
import { CatalogueItemView } from '../../catalogue/catalogue';
import { catalogueItem } from '../../catalogue/catalogue-item.builder';

const item = (itemId: string, name: string): CatalogueItemView => catalogueItem({ itemId, name });

// Market days whose one day has already arrived.
function showing(view: MarketDayView): FakeMarketDayFacade {
  const marketDays = new FakeMarketDayFacade();
  marketDays.showing(view);
  return marketDays;
}

// A catalogue that has already loaded these dishes.
function catalogueOf(...items: CatalogueItemView[]): FakeCatalogueFacade {
  const catalogue = new FakeCatalogueFacade();
  catalogue.items.set(items);
  return catalogue;
}

describe('LiveScreen', () => {
  it('waits while the day is still arriving', async () => {
    const page = await LiveScreenPageObject.render();

    expect(page.loadingStatus()).toBeTruthy();
  });

  it('names the day it is standing in', async () => {
    await LiveScreenPageObject.render({ marketDays: showing(day({ phase: 'due' })) });

    expect(screen.getByRole('heading', { name: /samedi 15 août/i })).toBeTruthy();
    expect(screen.getByText(/Marché de la Croix-Rousse/)).toBeTruthy();
  });

  // Unlike the editor, which offers the whole catalogue to tick, the live screen shows
  // only what the vendor brought — the rows are the day's menu, in catalogue order.
  it("lists the day's menu, not the whole catalogue", async () => {
    await LiveScreenPageObject.render({
      marketDays: showing(day({ phase: 'due', itemIds: ['item-3', 'item-1'] })),
      catalogue: catalogueOf(item('item-1', 'Bourguignon'), item('item-2', 'Rôti'), item('item-3', 'Tatin')),
    });

    expect(screen.getByText('Bourguignon')).toBeTruthy();
    expect(screen.getByText('Tatin')).toBeTruthy();
    expect(screen.queryByText('Rôti')).toBeNull();
  });

  // Decision 41's guard state: the commands this screen fires are refused for any day
  // but today, so the screen refuses the same thing — a reactive branch, not a route guard.
  it('says so when the day is not today', async () => {
    await LiveScreenPageObject.render({ marketDays: showing(day({ phase: 'future', itemIds: ['item-1'] })) });

    expect(screen.getByText(/ce marché n.a pas lieu aujourd.hui/i)).toBeTruthy();
    expect(screen.queryByText('Bourguignon')).toBeNull();
  });

  // A stale bookmark or a hand-typed URL — the editor's "n'est plus programmé" precedent.
  // The API answers 404 and the slot says missing, which lands in the same branch.
  it('says so when the day is unknown', async () => {
    const marketDays = new FakeMarketDayFacade();
    marketDays.day.set({ status: 'missing' });
    await LiveScreenPageObject.render({ marketDays });

    expect(screen.getByText(/ce marché n.a pas lieu aujourd.hui/i)).toBeTruthy();
  });

  // Decision 58: one day by id, never the 56-day window. The list drops a day at endTime,
  // which is mid-afternoon on the very screen the vendor ran the market on.
  it('asks for the one day it stands on, not the list', async () => {
    const marketDays = new FakeMarketDayFacade();
    await LiveScreenPageObject.render({ marketDays });

    expect(marketDays.loadedDays).toEqual([{ marketId: 'market-1', date: '2026-08-15' }]);
    expect(marketDays.loaded).toBe(false);
  });

  // Today, with Bourguignon and Tatin on the menu: both fakes, ready for render.
  const aLiveDay = (soldOutItemIds: string[] = [], overrides: Partial<MarketDayView> = {}) => ({
    marketDays: showing(day({ phase: 'due', itemIds: ['item-1', 'item-2'], soldOutItemIds, ...overrides })),
    catalogue: catalogueOf(item('item-1', 'Bourguignon'), item('item-2', 'Tatin')),
  });

  // Decision 7: marking is one fast tap on a full-width row, and the row moving into the
  // épuisé group is the receipt — no toast, no confirm.
  it('marks a dish sold out with one tap, the row moving as the receipt', async () => {
    const { marketDays, catalogue } = aLiveDay();
    const page = await LiveScreenPageObject.render({ marketDays, catalogue });

    page.markSoldOut('Bourguignon');

    expect(marketDays.availabilityChanges).toEqual([
      { marketId: 'market-1', date: '2026-08-15', itemId: 'item-1', soldOut: true },
    ]);
    expect(page.soldOutDish('Bourguignon')).toBeTruthy();
  });

  // Decision 7's undo: restore is a tap inside the épuisé group, not a toggle next to
  // the action it undoes.
  it('restores a dish with a tap inside the épuisé group', async () => {
    const { marketDays, catalogue } = aLiveDay(['item-2']);
    const page = await LiveScreenPageObject.render({ marketDays, catalogue });

    page.restore('Tatin');

    expect(marketDays.availabilityChanges).toEqual([
      { marketId: 'market-1', date: '2026-08-15', itemId: 'item-2', soldOut: false },
    ]);
    expect(page.querySoldOutGroup()).toBeNull();
  });

  it('splits the rows: sold-out dishes sit in the épuisé group, not the active list', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay(['item-1']));

    expect(page.soldOutDish('Bourguignon')).toBeTruthy();
    expect(page.querySoldOutDish('Tatin')).toBeNull();
  });

  it('keeps the épuisé group off the screen while everything is available', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay());

    expect(page.querySoldOutGroup()).toBeNull();
  });

  // Decision 20: the page mutates under a screen reader with no visible cue it can read —
  // the move is announced, politely.
  it('announces the move', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay());

    page.markSoldOut('Bourguignon');
    expect(screen.getByText('Bourguignon épuisé')).toBeTruthy();

    page.restore('Bourguignon');
    expect(screen.getByText('Bourguignon disponible')).toBeTruthy();
  });

  // Decision 27: a stated boundary, not a countdown — the screen re-asks the server
  // rather than computing when it stops being true.
  it('states when customers will see the menu, while waiting', async () => {
    await LiveScreenPageObject.render(aLiveDay());

    expect(screen.getByText(/vos clients verront ce menu à partir de 8h/i)).toBeTruthy();
    expect(screen.queryByText('En direct')).toBeNull();
  });

  // Decision 37: the banner's slot flips to the broadcast receipt — the one change on
  // this screen the vendor did not cause, which is why it must announce itself.
  it('flips the slot to the En direct receipt once the server says live', async () => {
    await LiveScreenPageObject.render({
      marketDays: showing(day({ phase: 'trading', itemIds: ['item-1', 'item-2'] })),
      catalogue: catalogueOf(item('item-1', 'Bourguignon'), item('item-2', 'Tatin')),
    });

    expect(screen.getByText('En direct')).toBeTruthy();
    expect(screen.queryByText(/verront ce menu/i)).toBeNull();
  });

  // Neither claim is honest with an empty menu (decision 12): the customer page shows
  // its normal face either way.
  it('claims nothing while the menu is empty', async () => {
    await LiveScreenPageObject.render({ marketDays: showing(day({ phase: 'trading' })) });

    expect(screen.queryByText('En direct')).toBeNull();
    expect(screen.queryByText(/verront ce menu/i)).toBeNull();
  });

  // Decision 20: the tapped row's element is destroyed when it changes group, which
  // strands keyboard and switch-control focus — so focus follows the row.
  it('moves focus with the row it moved', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay());

    page.markSoldOut('Bourguignon');

    await waitFor(() => expect(page.soldOutDish('Bourguignon')).toHaveFocus());
  });

  // Decision 38: no confirm dialog — the placement is the mistap protection, at the foot
  // of the page, furthest from the rows tapped all morning.
  it('closes the stand with a tap at the foot', async () => {
    const { marketDays, catalogue } = aLiveDay([], { phase: 'trading' });
    const page = await LiveScreenPageObject.render({ marketDays, catalogue });

    page.closeStand();

    expect(marketDays.closures).toEqual([{ marketId: 'market-1', date: '2026-08-15', closed: true }]);
  });

  // Decision 38: the closed screen is a full state, not a disabled one — the banner slot
  // says what the customer now sees, and Rouvrir sits exactly where Fermer stood.
  it('says the stand is closed and offers to reopen it', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay([], { phase: 'trading', closed: true }));

    expect(screen.getByText('Stand fermé')).toBeTruthy();
    expect(screen.getByText('Vos clients ne voient plus ce marché.')).toBeTruthy();
    expect(page.reopenStandButton()).toBeTruthy();
    expect(page.queryCloseStandButton()).toBeNull();
    expect(screen.queryByText('En direct')).toBeNull();
  });

  // Close is more reversible than sold-out (decision 38), so the door back is one tap in
  // the place the door out was — no confirm either.
  it('reopens the stand with a tap on Rouvrir', async () => {
    const { marketDays, catalogue } = aLiveDay([], { phase: 'trading', closed: true });
    const page = await LiveScreenPageObject.render({ marketDays, catalogue });

    page.reopenStand();

    expect(marketDays.closures).toEqual([{ marketId: 'market-1', date: '2026-08-15', closed: false }]);
  });

  // Decision 10: the editor must stay reachable during the market — *j'ai apporté une
  // plaque de plus* is real, and setMenu only ever guarded past days.
  it('keeps the editor reachable with a discreet link', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay([], { phase: 'trading' }));

    expect(page.editMenuLink().getAttribute('href')).toBe('/dashboard/market/market-1/2026-08-15/menu');
  });

  // Decision 38: the closed screen is a full state, not a disabled one. Decision 29 makes
  // the domain refuse setMenu once the stand is shut, so a link still offering it would
  // buy the vendor a 400 on the first mistap.
  it('takes the editor link away once the stand is closed', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay([], { phase: 'trading', closed: true }));

    expect(page.queryEditMenuLink()).toBeNull();
  });

  // Decision 63: the screen stops offering the editor once the market is over, while the
  // domain keeps accepting the edit — the same split decision 60 makes for the rows one
  // line above. A menu edited at 15h rewrites the set 2b is about to ask the vendor to
  // judge, and nothing on this screen should invite that.
  it('takes the editor link away once the market is over', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay([], { phase: 'over' }));

    expect(page.queryEditMenuLink()).toBeNull();
  });

  // Decision 48: inert means the rows stop being availability controls, not that they stop
  // being rows — they keep their markup and both groups keep their split, which is what
  // decision 70 left standing when the bilan took its own route. Asserted as disabled rather than by clicking: fireEvent
  // dispatches straight to the listener, where a browser suppresses activation entirely.
  it('stops the rows being availability controls once the stand is closed', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay(['item-2'], { phase: 'trading', closed: true }));

    expect(page.dish('Bourguignon')).toBeDisabled();
    expect(page.soldOutDish('Tatin')).toBeDisabled();
  });

  // Decision 59: one timer off the server-said duration, not a 60s interval. The screen
  // asks again exactly when the phase it is showing has run out — the timer decides when
  // to ask, never what the answer is, so firing late is self-correcting.
  describe('asking again when the phase turns over', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('re-asks when the countdown runs out', async () => {
      const { marketDays, catalogue } = aLiveDay([], { phase: 'due', nextPhaseInMs: 60_000 });
      await LiveScreenPageObject.render({ marketDays, catalogue });

      vi.advanceTimersByTime(60_000);

      expect(marketDays.loadedDays).toHaveLength(2);
    });

    it('waits for the whole countdown, and a tap in the meantime does not restart it', async () => {
      const { marketDays, catalogue } = aLiveDay([], { phase: 'trading', nextPhaseInMs: 60_000 });
      const page = await LiveScreenPageObject.render({ marketDays, catalogue });

      vi.advanceTimersByTime(30_000);
      page.markSoldOut('Bourguignon');
      vi.advanceTimersByTime(30_000);

      expect(marketDays.loadedDays).toHaveLength(2);
    });

    // Decision 61: nothing follows `past`, so there is nothing to wait for.
    it('sets no timer on a day that carries no countdown', async () => {
      const { marketDays, catalogue } = aLiveDay([], { phase: 'over' });
      await LiveScreenPageObject.render({ marketDays, catalogue });

      vi.advanceTimersByTime(24 * 60 * 60_000);

      expect(marketDays.loadedDays).toHaveLength(1);
    });
  });

  // A backgrounded phone fires no timer, which is what this is for: the vendor puts the
  // phone in their apron at 11h and takes it out at 13h30.
  it('asks again when the tab comes back', async () => {
    const { marketDays, catalogue } = aLiveDay([], { phase: 'trading' });
    const page = await LiveScreenPageObject.render({ marketDays, catalogue });

    page.comeBackToTab();

    expect(marketDays.loadedDays).toHaveLength(2);
  });

  // Decision 60: `over` is a full state, not the else-branch of the foot. Before the point
  // lookup an ended day could not reach this screen at all; now it stays open on it all
  // afternoon, and the foot would otherwise offer *je ne peux pas venir* at 13h05 to a
  // vendor who traded all morning.
  it('says the market is over once the clock has ended it', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay([], { phase: 'over' }));

    expect(screen.getByText('Marché terminé')).toBeTruthy();
    expect(page.queryCloseStandButton()).toBeNull();
    expect(page.queryCallOffButton()).toBeNull();
  });

  // Decision 48's treatment, for the same reason one phase later: *épuisé* is a claim
  // about a stall that is no longer there, and decision 49 reads these marks back as a
  // rating. The rows stay rows; the bilan is a link at the foot, not a mode on them.
  it('stops the rows being availability controls once the market is over', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay(['item-2'], { phase: 'over' }));

    expect(page.dish('Bourguignon')).toBeDisabled();
    expect(page.soldOutDish('Tatin')).toBeDisabled();
  });

  // Decision 70: the bilan took its own route, so the foot decision 60 left empty carries
  // the door to it rather than the rating itself.
  it('offers the bilan once the market is over', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay([], { phase: 'over' }));

    expect(page.bilanLink().getAttribute('href')).toBe('/dashboard/market/market-1/2026-08-15/bilan');
  });

  // A closed day is finished whatever the clock says (decision 69), so the vendor who
  // packed up at 11h can judge the morning without waiting for endTime.
  it('offers the bilan on a stand the vendor closed early', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay([], { phase: 'trading', closed: true }));

    expect(page.bilanLink()).toBeTruthy();
    expect(page.reopenStandButton()).toBeTruthy();
  });

  // Decision 75: *je ne peux pas venir* before the market opened calls the day off — the
  // rows stay dead, because a closed stand takes no marks, but there is no morning to look
  // back on and the domain would refuse the bilan.
  it('offers no bilan on a stand called off before the market opened', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay([], { phase: 'due', closed: true, calledOff: true }));

    expect(page.queryBilanLink()).toBeNull();
    expect(page.dish('Bourguignon')).toBeDisabled();
    expect(page.reopenStandButton()).toBeTruthy();
  });

  // The domain refuses a bilan for a day still being traded, and the screen declines the
  // same thing rather than offering a door onto a refusal.
  it('offers no bilan while the stand is still open', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay([], { phase: 'trading' }));

    expect(page.queryBilanLink()).toBeNull();
  });

  // A live defect the moment `over` can reach the screen: decision 50 makes reopen raise
  // MarketDayEndedError past endTime, and the failure path is a silent snap-back — a
  // button that does nothing.
  it('offers no reopen once the clock has ended the day', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay([], { phase: 'over', closed: true }));

    expect(page.queryReopenStandButton()).toBeNull();
  });

  // Decision 52: the verb flips at startTime because a door is an offer, not a record —
  // *je ne peux pas venir* is what the vendor means at 7h, *fermer le stand* at 9h.
  it('offers the call-off before the market starts', async () => {
    const { marketDays, catalogue } = aLiveDay();
    const page = await LiveScreenPageObject.render({ marketDays, catalogue });

    page.callOff();

    expect(marketDays.closures).toEqual([{ marketId: 'market-1', date: '2026-08-15', closed: true }]);
    expect(page.queryCloseStandButton()).toBeNull();
  });

  it('swaps the verb for Fermer le stand once the market is running', async () => {
    const page = await LiveScreenPageObject.render(aLiveDay([], { phase: 'trading' }));

    expect(page.closeStandButton()).toBeTruthy();
    expect(page.queryCallOffButton()).toBeNull();
  });

  // The door is gated on today, not on a menu: decision 16's guard is *today*, and an empty
  // menu makes the sentence no less true. The banner is the half that needs a menu.
  it('offers the call-off with no menu at all', async () => {
    const page = await LiveScreenPageObject.render({ marketDays: showing(day({ phase: 'due' })) });

    expect(page.callOffButton()).toBeTruthy();
    expect(screen.queryByText(/verront ce menu/i)).toBeNull();
  });
});
