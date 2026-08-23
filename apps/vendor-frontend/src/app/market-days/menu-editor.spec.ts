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
import { MarketPricesFacade } from '../market-prices/market-prices.facade';
import { FakeMarketPricesFacade } from '../market-prices/fake.market-prices.facade';
import { SellingRecordFacade } from '../selling-record/selling-record.facade';
import { FakeSellingRecordFacade } from '../selling-record/fake.selling-record.facade';
import { MarketRecord } from '../selling-record/selling-record';
import { ItemOutcome } from './market-days';

const item = (itemId: string, name: string): CatalogueItemView => catalogueItem({ itemId, name });

// Oldest bilan first, as the fold hands them over. The dates only have to increase: nothing
// on this screen shows them, and only their order decides the tie-break.
const broughtTo = (marketId: string, itemId: string, ...outcomes: ItemOutcome[]): MarketRecord => ({
  marketId,
  items: [{ itemId, bilans: outcomes.map((outcome, index) => ({ date: `2026-07-0${index + 1}`, outcome })) }],
});

async function renderEditor(
  setup: (
    marketDays: FakeMarketDayFacade,
    catalogue: FakeCatalogueFacade,
    prices: FakeMarketPricesFacade,
    record: FakeSellingRecordFacade,
  ) => void,
) {
  const marketDays = new FakeMarketDayFacade();
  const catalogue = new FakeCatalogueFacade();
  const prices = new FakeMarketPricesFacade();
  const record = new FakeSellingRecordFacade();
  setup(marketDays, catalogue, prices, record);
  const view = await render(MenuEditor, {
    providers: [
      provideRouter([]),
      { provide: MarketDayFacade, useValue: marketDays },
      { provide: CatalogueFacade, useValue: catalogue },
      { provide: MarketPricesFacade, useValue: prices },
      { provide: SellingRecordFacade, useValue: record },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ marketId: 'market-1', date: '2026-08-15' }) } },
      },
    ],
  });
  return { view, marketDays, catalogue, prices, record };
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

  it('loads every feed it needs', async () => {
    const { marketDays, catalogue, prices, record } = await renderEditor(() => undefined);

    expect(marketDays.loaded).toBe(true);
    expect(catalogue.loaded).toBe(true);
    expect(prices.loaded).toBe(true);
    expect(record.loaded).toBe(true);
  });


  // Two doorways in (decision 10, and decision 51's unplanned today), so backing out goes
  // where the card would send them now rather than always to the dashboard.
  it('backs out to the live screen when the day is a planned today', async () => {
    await renderEditor((marketDays) => marketDays.days.set([day({ phase: 'due', itemIds: ['item-1'] })]));

    expect(screen.getByRole('link', { name: /retour/i }).getAttribute('href')).toBe(
      '/dashboard/live/market-1/2026-08-15',
    );
  });

  it('backs out to the dashboard when the day has no live screen to go back to', async () => {
    await renderEditor((marketDays) => marketDays.days.set([day({ phase: 'due' })]));

    expect(screen.getByRole('link', { name: /retour/i }).getAttribute('href')).toBe('/dashboard');
  });

  // Decision 53: browser-back after closing is one gesture, and a hand-typed URL lands the
  // same way — a normal editor would offer an Enregistrer decision 29 refuses in silence.
  it('renders the closed state in place of the list', async () => {
    await renderEditor((md, cat) => {
      md.days.set([day({ phase: 'due', closed: true })]);
      cat.items.set([item('item-1', 'Bourguignon')]);
    });

    expect(screen.getByText('Stand fermé')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).toBeNull();
    expect(screen.queryByText('Bourguignon')).toBeNull();
  });

  // Decision 53: the undo is one tap where the state renders, not a link to somewhere it
  // renders better — this is the path of the tap nobody meant.
  it('reopens the stand from the editor', async () => {
    const { marketDays } = await renderEditor((md) => md.days.set([day({ phase: 'due', closed: true })]));

    fireEvent.click(screen.getByRole('button', { name: 'Rouvrir le stand' }));

    expect(marketDays.closures).toEqual([{ marketId: 'market-1', date: '2026-08-15', closed: false }]);
  });

  // The picker quoted the carte price at every market, which for a market with its own
  // prices is a number the customer will not be charged.
  it('quotes a dish at what this market charges', async () => {
    await renderEditor((marketDays, catalogue, prices) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bœuf bourguignon')]);
      prices.markets.set([{ marketId: 'market-1', prices: { 'item-1': 1500 } }]);
    });

    expect(screen.getByText(/15,00/)).toBeInTheDocument();
  });

  it('marks the dishes it is quoting at a market price', async () => {
    await renderEditor((marketDays, catalogue, prices) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bœuf bourguignon'), item('item-2', 'Tarte aux pommes')]);
      prices.markets.set([{ marketId: 'market-1', prices: { 'item-1': 1500 } }]);
    });

    expect(screen.getAllByText(/tarif marché/i)).toHaveLength(1);
  });

  it('quotes the carte price where this market sets none', async () => {
    await renderEditor((marketDays, catalogue, prices) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bœuf bourguignon')]);
      prices.markets.set([{ marketId: 'market-9', prices: { 'item-1': 1500 } }]);
    });

    expect(screen.getByText(/13,00/)).toBeInTheDocument();
    expect(screen.queryByText(/tarif marché/i)).toBeNull();
  });

  const pizza = () =>
    catalogueItem({
      itemId: 'pizza',
      name: 'Pizza',
      price: undefined,
      variants: [
        { name: 'Margherita', description: '', price: 900 },
        { name: 'Pepperoni', description: '', price: 1200 },
      ],
    });

  it('takes the cheapest variant at what this market charges for it', async () => {
    await renderEditor((marketDays, catalogue, prices) => {
      marketDays.days.set([day()]);
      catalogue.items.set([pizza()]);
      prices.markets.set([{ marketId: 'market-1', prices: { pizza: { Margherita: 800 } } }]);
    });

    expect(screen.getByText(/dès\s+8,00/)).toBeInTheDocument();
    expect(screen.getByText(/tarif marché/i)).toBeInTheDocument();
  });

  // The cue describes the figure beside it. A market price on the dearer variant does not
  // change what "dès" names, so the row still quotes — and reads as — the carte's.
  it('leaves the row uncued when the cheapest variant is still the carte\'s', async () => {
    await renderEditor((marketDays, catalogue, prices) => {
      marketDays.days.set([day()]);
      catalogue.items.set([pizza()]);
      prices.markets.set([{ marketId: 'market-1', prices: { pizza: { Pepperoni: 1400 } } }]);
    });

    expect(screen.getByText(/dès\s+9,00/)).toBeInTheDocument();
    expect(screen.queryByText(/tarif marché/i)).toBeNull();
  });

  it('takes a market price that undercuts a dearer variant', async () => {
    await renderEditor((marketDays, catalogue, prices) => {
      marketDays.days.set([day()]);
      catalogue.items.set([pizza()]);
      prices.markets.set([{ marketId: 'market-1', prices: { pizza: { Pepperoni: 500 } } }]);
    });

    expect(screen.getByText(/dès\s+5,00/)).toBeInTheDocument();
    expect(screen.getByText(/tarif marché/i)).toBeInTheDocument();
  });

  // No price editing from a day: editing here would imply the price belongs to this day,
  // and it belongs to the market — the edit would silently move every other day at it.
  it('sends the vendor to the market for its prices rather than editing them here', async () => {
    await renderEditor((marketDays, catalogue) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bœuf bourguignon')]);
    });

    expect(screen.getByRole('link', { name: /tarifs de ce marché/i })).toHaveAttribute(
      'href',
      '/dashboard/market-prices/market-1',
    );
  });

  // Prices landing after the carte would quote every dish at its carte price for a frame —
  // the very number this screen exists to stop showing.
  it('keeps waiting while this market\'s prices are still arriving', async () => {
    await renderEditor((marketDays, catalogue, prices) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bœuf bourguignon')]);
      prices.loading.set(true);
    });

    expect(screen.getByRole('status', { name: /chargement/i })).toBeTruthy();
    expect(screen.queryByText(/13,00/)).toBeNull();
  });

  it('names the pile under a dish it has brought to this market before', async () => {
    await renderEditor((marketDays, catalogue, prices, record) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bourguignon')]);
      record.markets.set([broughtTo('market-1', 'item-1', 'sold_out', 'sold_out', 'did_well')]);
    });

    expect(screen.getByText('Toujours épuisé')).toBeTruthy();
  });

  // The row is a <label> around a checkbox, so anything inside it is read out as part of
  // the control's name. The pile is a claim about the dish, not a name for the tick —
  // and text inside the label is also a tap that ticks the dish when the vendor meant to
  // read it (decision 14). Guards the structure, which the visuals are free to move.
  it('keeps the pile out of the name of the checkbox it sits under', async () => {
    await renderEditor((marketDays, catalogue, prices, record) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bourguignon')]);
      record.markets.set([broughtTo('market-1', 'item-1', 'sold_out', 'sold_out', 'sold_out')]);
    });

    expect(screen.getByRole('checkbox', { name: /Bourguignon/ })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /Toujours épuisé/ })).toBeNull();
  });

  it('calls a dish that mostly did well Ça part bien', async () => {
    await renderEditor((marketDays, catalogue, prices, record) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bourguignon')]);
      record.markets.set([broughtTo('market-1', 'item-1', 'did_well', 'did_well', 'sold_out')]);
    });

    expect(screen.getByText('Ça part bien')).toBeTruthy();
  });

  // Moins bien vendu is a fair thing to tick once and a scolding thing to read down a
  // column; Il en reste is what the vendor says out loud about a tray that came home.
  it('calls a dish that mostly came home Il en reste', async () => {
    await renderEditor((marketDays, catalogue, prices, record) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bourguignon')]);
      record.markets.set([
        broughtTo('market-1', 'item-1', 'did_not_do_well', 'did_not_do_well', 'did_well'),
      ]);
    });

    expect(screen.getByText('Il en reste')).toBeTruthy();
  });

  // Not a failure to classify but a real finding: this dish rides on weather or crowd, and
  // burying it in an unclassified bucket would hide what most deserves the vendor's own
  // judgment (decision 7).
  it('calls a dish with no dominant outcome Ça dépend des jours', async () => {
    await renderEditor((marketDays, catalogue, prices, record) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bourguignon')]);
      record.markets.set([
        broughtTo('market-1', 'item-1', 'sold_out', 'did_well', 'did_not_do_well'),
      ]);
    });

    expect(screen.getByText('Ça dépend des jours')).toBeTruthy();
  });

  // Shows its answers and claims nothing. Three is where a pile starts being a claim, so
  // two sold-out mornings must not read as Toujours épuisé.
  it('claims nothing about a dish with only two bilans here', async () => {
    await renderEditor((marketDays, catalogue, prices, record) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bourguignon')]);
      record.markets.set([broughtTo('market-1', 'item-1', 'sold_out', 'sold_out')]);
    });

    expect(screen.getByText('Trop tôt pour dire')).toBeTruthy();
    expect(screen.queryByText('Toujours épuisé')).toBeNull();
  });

  // Jamais apporté ici is a pile on the record page, where it is the only forward-looking
  // one. Here it would be a line under most of the carte saying nothing.
  it('says nothing under a dish it has never brought here', async () => {
    await renderEditor((marketDays, catalogue, prices, record) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bourguignon'), item('item-2', 'Tatin')]);
      record.markets.set([broughtTo('market-1', 'item-1', 'sold_out', 'sold_out', 'sold_out')]);
    });

    expect(screen.getByText('Toujours épuisé')).toBeTruthy();
    expect(screen.queryByText('Trop tôt pour dire')).toBeNull();
  });

  // The clientele is the market's, not the carte's: a dish that empties at la Croix-Rousse
  // can come home from Monplaisir, and a line pooling the two describes no morning the
  // vendor will actually have (decision 2).
  it('reads only what this market said, never another market\'s', async () => {
    await renderEditor((marketDays, catalogue, prices, record) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bourguignon')]);
      record.markets.set([
        broughtTo('market-9', 'item-1', 'sold_out', 'sold_out', 'sold_out'),
      ]);
    });

    expect(screen.queryByText('Toujours épuisé')).toBeNull();
  });

  // Two outcomes can both reach half. The recent morning is the one that describes the
  // clientele the vendor is packing for tomorrow, so it breaks the tie.
  it('breaks a tie toward the most recent bilan', async () => {
    await renderEditor((marketDays, catalogue, prices, record) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bourguignon')]);
      record.markets.set([
        broughtTo('market-1', 'item-1', 'sold_out', 'sold_out', 'did_well', 'did_well'),
      ]);
    });

    expect(screen.getByText('Ça part bien')).toBeTruthy();
    expect(screen.queryByText('Toujours épuisé')).toBeNull();
  });

  // A fourth feed landing late would reflow every row under the vendor's thumb — the pile
  // line appearing after the fact moves the row below it while they are aiming at it.
  it('keeps waiting while the selling record is still arriving', async () => {
    await renderEditor((marketDays, catalogue, prices, record) => {
      marketDays.days.set([day()]);
      catalogue.items.set([item('item-1', 'Bourguignon')]);
      record.loading.set(true);
    });

    expect(screen.getByRole('status', { name: /chargement/i })).toBeTruthy();
    expect(screen.queryByText('Bourguignon')).toBeNull();
  });
});
