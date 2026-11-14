import { screen } from '@testing-library/angular';
import { PriceEditorPageObject } from './price-editor.page-object';
import { FakeMarketPricesFacade } from './fake.market-prices.facade';
import { PriceList } from './market-prices';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { CatalogueItemView } from '../catalogue/catalogue';
import { catalogueItem } from '../catalogue/catalogue-item.builder';
import { FakeMarketScheduleFacade } from '../markets/fake.market-schedule.facade';
import { MarketScheduleView } from '../markets/market-schedules';

const schedule = (marketId: string, name: string): MarketScheduleView => ({
  scheduleId: `schedule-${marketId}`,
  marketId,
  market: { name, codePostal: '75011', town: 'Paris' },
  startDate: '2026-07-15',
  days: [{ day: 'TUE', startTime: '08:00', endTime: '13:00' }],
  frequency: { weeks: 1 },
});

// The market the editor opens on, as the vendor's schedules name it.
const belleville = schedule('market-1', 'Marché de Belleville');

// A catalogue that has already loaded these dishes.
function catalogueOf(...items: CatalogueItemView[]): FakeCatalogueFacade {
  const catalogue = new FakeCatalogueFacade();
  catalogue.items.set(items);
  return catalogue;
}

// Prices that have already loaded, by market.
function pricesOf(byMarket: Record<string, PriceList>): FakeMarketPricesFacade {
  const prices = new FakeMarketPricesFacade();
  prices.byMarket.set(byMarket);
  return prices;
}

// Schedules that have already loaded.
function schedulesOf(...views: MarketScheduleView[]): FakeMarketScheduleFacade {
  const schedules = new FakeMarketScheduleFacade();
  schedules.schedules.set(views);
  return schedules;
}

describe('PriceEditor', () => {
  it('gives every dish in the catalogue a field of its own', async () => {
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(
        catalogueItem({ itemId: 'item-1', name: 'Bœuf bourguignon' }),
        catalogueItem({ itemId: 'item-2', name: 'Tarte aux pommes' }),
      ),
      schedules: schedulesOf(belleville),
    });

    expect(page.priceField('Bœuf bourguignon')).toBeInTheDocument();
    expect(page.priceField('Tarte aux pommes')).toBeInTheDocument();
  });

  it('shows what a dish costs on the carte beside its field', async () => {
    await PriceEditorPageObject.render({
      catalogue: catalogueOf(catalogueItem({ price: 1300 })),
      schedules: schedulesOf(belleville),
    });

    expect(screen.getByText(/carte\s+13,00/)).toBeInTheDocument();
  });

  it('gives every variant its own field, under the dish it belongs to', async () => {
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(
        catalogueItem({
          itemId: 'pizza',
          name: 'Pizza',
          price: undefined,
          variants: [
            { name: 'Margherita', description: '', price: 900 },
            { name: 'Pepperoni', description: 'piquante', price: 1200 },
          ],
        }),
      ),
      schedules: schedulesOf(belleville),
    });

    expect(screen.getByRole('heading', { name: 'Pizza' })).toBeInTheDocument();
    expect(page.priceField('Margherita')).toBeInTheDocument();
    expect(page.priceField('Pepperoni')).toBeInTheDocument();
    expect(screen.getByText(/carte\s+9,00/)).toBeInTheDocument();
    expect(screen.getByText(/carte\s+12,00/)).toBeInTheDocument();
    expect(page.queryPriceField('Pizza')).toBeNull();
  });

  it('fills a field with what the dish already costs at this market', async () => {
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(catalogueItem({ itemId: 'item-1', price: 1300 })),
      prices: pricesOf({ 'market-1': { 'item-1': 1500 } }),
      schedules: schedulesOf(belleville),
    });

    expect(page.priceField('Bœuf bourguignon')).toHaveValue('15,00');
  });

  it('leaves a field blank where the market charges the carte price', async () => {
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(catalogueItem({ itemId: 'item-1', price: 1300 })),
      prices: pricesOf({ 'market-2': { 'item-1': 1500 } }),
      schedules: schedulesOf(belleville),
    });

    expect(page.priceField('Bœuf bourguignon')).toHaveValue('');
  });

  it('fills a variant field from the variant it names', async () => {
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(
        catalogueItem({
          itemId: 'pizza',
          name: 'Pizza',
          price: undefined,
          variants: [
            { name: 'Margherita', description: '', price: 900 },
            { name: 'Pepperoni', description: '', price: 1200 },
          ],
        }),
      ),
      prices: pricesOf({ 'market-1': { pizza: { Pepperoni: 1400 } } }),
      schedules: schedulesOf(belleville),
    });

    expect(page.priceField('Margherita')).toHaveValue('');
    expect(page.priceField('Pepperoni')).toHaveValue('14,00');
  });

  // The read side ignores a mismatched shape rather than refusing it, so the screen has
  // to render one. Falling back to the carte price is the answer the customer sees.
  it('ignores a stored price whose shape no longer fits the dish', async () => {
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(catalogueItem({ itemId: 'item-1', price: 1300 })),
      prices: pricesOf({ 'market-1': { 'item-1': { Grande: 1500 } } }),
      schedules: schedulesOf(belleville),
    });

    expect(page.priceField('Bœuf bourguignon')).toHaveValue('');
  });

  it('sends what the vendor typed as the market\'s whole list', async () => {
    const prices = new FakeMarketPricesFacade();
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(
        catalogueItem({ itemId: 'item-1', name: 'Bœuf bourguignon', price: 1300 }),
        catalogueItem({ itemId: 'item-2', name: 'Tarte aux pommes', price: 650 }),
      ),
      prices,
      schedules: schedulesOf(belleville),
    });

    page.enterPrice('Bœuf bourguignon', '15,00').save();

    expect(prices.saved).toEqual({ marketId: 'market-1', prices: { 'item-1': 1500 } });
  });

  it('sends a dish sold by variant as a price per variant', async () => {
    const prices = new FakeMarketPricesFacade();
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(
        catalogueItem({
          itemId: 'pizza',
          name: 'Pizza',
          price: undefined,
          variants: [
            { name: 'Margherita', description: '', price: 900 },
            { name: 'Pepperoni', description: '', price: 1200 },
          ],
        }),
      ),
      prices,
      schedules: schedulesOf(belleville),
    });

    page.enterPrice('Pepperoni', '14,00').save();

    expect(prices.saved).toEqual({ marketId: 'market-1', prices: { pizza: { Pepperoni: 1400 } } });
  });

  // Empty is legal and means the market sells at the carte price throughout — the vendor
  // clears a market by emptying its fields, not by finding a delete button.
  it('sends an empty list when every field is blank', async () => {
    const prices = pricesOf({ 'market-1': { 'item-1': 1500 } });
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(catalogueItem({ itemId: 'item-1', price: 1300 })),
      prices,
      schedules: schedulesOf(belleville),
    });

    page.clearPrice('Bœuf bourguignon').save();

    expect(prices.saved).toEqual({ marketId: 'market-1', prices: {} });
  });

  it('flags a price it cannot read', async () => {
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(catalogueItem({ itemId: 'item-1', price: 1300 })),
      schedules: schedulesOf(belleville),
    });

    page.enterPrice('Bœuf bourguignon', 'quinze');

    expect(page.priceAlert()).toHaveTextContent(/12,00/);
  });

  // Dropping it silently would send the dish back to its carte price — the vendor typed a
  // number, so saying nothing and charging less is the one outcome they cannot see coming.
  it('will not save while a price is unreadable', async () => {
    const prices = new FakeMarketPricesFacade();
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(catalogueItem({ itemId: 'item-1', price: 1300 })),
      prices,
      schedules: schedulesOf(belleville),
    });

    page.enterPrice('Bœuf bourguignon', 'quinze').save();

    expect(prices.saved).toBeUndefined();
  });

  it('marks the rows this market already prices', async () => {
    await PriceEditorPageObject.render({
      catalogue: catalogueOf(
        catalogueItem({ itemId: 'item-1', name: 'Bœuf bourguignon', price: 1300 }),
        catalogueItem({ itemId: 'item-2', name: 'Tarte aux pommes', price: 650 }),
      ),
      prices: pricesOf({ 'market-1': { 'item-1': 1500 } }),
      schedules: schedulesOf(belleville),
    });

    expect(screen.getAllByText(/tarif marché/i)).toHaveLength(1);
  });

  it('counts the rows the vendor has changed on the save button', async () => {
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(
        catalogueItem({ itemId: 'item-1', name: 'Bœuf bourguignon', price: 1300 }),
        catalogueItem({ itemId: 'item-2', name: 'Tarte aux pommes', price: 650 }),
      ),
      schedules: schedulesOf(belleville),
    });

    page.enterPrice('Bœuf bourguignon', '15,00');

    expect(page.saveButton()).toHaveAccessibleName(/enregistrer \(1\)/i);
  });

  // A cleared row has nothing of its own left to show — the field is empty and the market
  // marker is gone — so the count is the only thing telling the vendor it is unsaved.
  it('counts a row cleared back to the carte price', async () => {
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(catalogueItem({ itemId: 'item-1', price: 1300 })),
      prices: pricesOf({ 'market-1': { 'item-1': 1500 } }),
      schedules: schedulesOf(belleville),
    });

    page.clearPrice('Bœuf bourguignon');

    expect(page.saveButton()).toHaveAccessibleName(/enregistrer \(1\)/i);
  });

  it('counts nothing before the vendor changes anything', async () => {
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(catalogueItem({ itemId: 'item-1', price: 1300 })),
      prices: pricesOf({ 'market-1': { 'item-1': 1500 } }),
      schedules: schedulesOf(belleville),
    });

    expect(page.saveButton()).toHaveAccessibleName(/^enregistrer$/i);
  });

  it('names the market it is pricing', async () => {
    await PriceEditorPageObject.render({ schedules: schedulesOf(belleville) });

    expect(screen.getByText('Marché de Belleville')).toBeInTheDocument();
  });

  // A stale bookmark, or a schedule cancelled since. The domain refuses prices for a market
  // the vendor does not stand at, so a form here could only be typed into and rejected.
  it('says so when the market is no longer scheduled', async () => {
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(catalogueItem({ itemId: 'item-1', price: 1300 })),
      schedules: schedulesOf(schedule('market-9', 'Marché d\'Aligre')),
    });

    expect(screen.getByText(/n.est plus programmé/i)).toBeInTheDocument();
    expect(page.querySaveButton()).toBeNull();
  });

  // Schedules land after the first paint, so without gating the screen states, for a frame,
  // that a market the vendor stands at every week is no longer programmed.
  it('waits while the schedules are still arriving', async () => {
    const schedules = schedulesOf();
    schedules.loading.set(true);
    const page = await PriceEditorPageObject.render({ schedules });

    expect(page.loadingStatus()).toBeInTheDocument();
    expect(screen.queryByText(/n.est plus programmé/i)).toBeNull();
  });

  it('keeps waiting while the catalogue is still arriving', async () => {
    const catalogue = new FakeCatalogueFacade();
    catalogue.loading.set(true);
    const page = await PriceEditorPageObject.render({ catalogue, schedules: schedulesOf(belleville) });

    expect(page.loadingStatus()).toBeInTheDocument();
  });

  // Rows seeded before the stored list lands would show every dish at its carte price, and
  // a vendor who typed into that would save over prices they never saw.
  it('keeps waiting while this market\'s prices are still arriving', async () => {
    const prices = new FakeMarketPricesFacade();
    prices.loading.set(true);
    const page = await PriceEditorPageObject.render({
      catalogue: catalogueOf(catalogueItem({ itemId: 'item-1', price: 1300 })),
      prices,
      schedules: schedulesOf(belleville),
    });

    expect(page.loadingStatus()).toBeInTheDocument();
    expect(page.queryPriceField('Bœuf bourguignon')).toBeNull();
  });

  it('says the carte is empty when there is nothing to price', async () => {
    const page = await PriceEditorPageObject.render({ schedules: schedulesOf(belleville) });

    expect(screen.getByText(/carte est vide/i)).toBeInTheDocument();
    expect(page.querySaveButton()).toBeNull();
  });
});
