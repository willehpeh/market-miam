import { fireEvent, render, screen } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PriceEditor } from './price-editor';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { catalogueItem } from '../catalogue/catalogue-item.builder';
import { MarketPricesFacade } from './market-prices.facade';
import { FakeMarketPricesFacade } from './fake.market-prices.facade';
import { MarketScheduleFacade } from '../markets/market-schedule.facade';
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

async function renderEditor(
  setup: (
    catalogue: FakeCatalogueFacade,
    prices: FakeMarketPricesFacade,
    schedules: FakeMarketScheduleFacade,
  ) => void = () => undefined,
) {
  const catalogue = new FakeCatalogueFacade();
  const prices = new FakeMarketPricesFacade();
  const schedules = new FakeMarketScheduleFacade();
  schedules.schedules.set([schedule('market-1', 'Marché de Belleville')]);
  setup(catalogue, prices, schedules);
  const view = await render(PriceEditor, {
    providers: [
      provideRouter([]),
      { provide: CatalogueFacade, useValue: catalogue },
      { provide: MarketPricesFacade, useValue: prices },
      { provide: MarketScheduleFacade, useValue: schedules },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ marketId: 'market-1' }) } },
      },
    ],
  });
  return { view, catalogue, prices, schedules };
}

describe('PriceEditor', () => {
  it('gives every dish in the catalogue a field of its own', async () => {
    await renderEditor((catalogue) =>
      catalogue.items.set([
        catalogueItem({ itemId: 'item-1', name: 'Bœuf bourguignon' }),
        catalogueItem({ itemId: 'item-2', name: 'Tarte aux pommes' }),
      ]),
    );

    expect(screen.getByLabelText('Bœuf bourguignon')).toBeInTheDocument();
    expect(screen.getByLabelText('Tarte aux pommes')).toBeInTheDocument();
  });

  it('shows what a dish costs on the carte beside its field', async () => {
    await renderEditor((catalogue) => catalogue.items.set([catalogueItem({ price: 1300 })]));

    expect(screen.getByText(/carte\s+13,00/)).toBeInTheDocument();
  });

  it('gives every variant its own field, under the dish it belongs to', async () => {
    await renderEditor((catalogue) =>
      catalogue.items.set([
        catalogueItem({
          itemId: 'pizza',
          name: 'Pizza',
          price: undefined,
          variants: [
            { name: 'Margherita', description: '', price: 900 },
            { name: 'Pepperoni', description: 'piquante', price: 1200 },
          ],
        }),
      ]),
    );

    expect(screen.getByRole('heading', { name: 'Pizza' })).toBeInTheDocument();
    expect(screen.getByLabelText('Margherita')).toBeInTheDocument();
    expect(screen.getByLabelText('Pepperoni')).toBeInTheDocument();
    expect(screen.getByText(/carte\s+9,00/)).toBeInTheDocument();
    expect(screen.getByText(/carte\s+12,00/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Pizza')).toBeNull();
  });

  it('fills a field with what the dish already costs at this market', async () => {
    await renderEditor((catalogue, prices) => {
      catalogue.items.set([catalogueItem({ itemId: 'item-1', price: 1300 })]);
      prices.markets.set([{ marketId: 'market-1', prices: { 'item-1': 1500 } }]);
    });

    expect(screen.getByLabelText('Bœuf bourguignon')).toHaveValue('15,00');
  });

  it('leaves a field blank where the market charges the carte price', async () => {
    await renderEditor((catalogue, prices) => {
      catalogue.items.set([catalogueItem({ itemId: 'item-1', price: 1300 })]);
      prices.markets.set([{ marketId: 'market-2', prices: { 'item-1': 1500 } }]);
    });

    expect(screen.getByLabelText('Bœuf bourguignon')).toHaveValue('');
  });

  it('fills a variant field from the variant it names', async () => {
    await renderEditor((catalogue, prices) => {
      catalogue.items.set([
        catalogueItem({
          itemId: 'pizza',
          name: 'Pizza',
          price: undefined,
          variants: [
            { name: 'Margherita', description: '', price: 900 },
            { name: 'Pepperoni', description: '', price: 1200 },
          ],
        }),
      ]);
      prices.markets.set([{ marketId: 'market-1', prices: { pizza: { Pepperoni: 1400 } } }]);
    });

    expect(screen.getByLabelText('Margherita')).toHaveValue('');
    expect(screen.getByLabelText('Pepperoni')).toHaveValue('14,00');
  });

  // The read side ignores a mismatched shape rather than refusing it, so the screen has
  // to render one. Falling back to the carte price is the answer the customer sees.
  it('ignores a stored price whose shape no longer fits the dish', async () => {
    await renderEditor((catalogue, prices) => {
      catalogue.items.set([catalogueItem({ itemId: 'item-1', price: 1300 })]);
      prices.markets.set([{ marketId: 'market-1', prices: { 'item-1': { Grande: 1500 } } }]);
    });

    expect(screen.getByLabelText('Bœuf bourguignon')).toHaveValue('');
  });

  it('sends what the vendor typed as the market\'s whole list', async () => {
    const { prices } = await renderEditor((catalogue) =>
      catalogue.items.set([
        catalogueItem({ itemId: 'item-1', name: 'Bœuf bourguignon', price: 1300 }),
        catalogueItem({ itemId: 'item-2', name: 'Tarte aux pommes', price: 650 }),
      ]),
    );

    fireEvent.input(screen.getByLabelText('Bœuf bourguignon'), { target: { value: '15,00' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(prices.saved).toEqual({ marketId: 'market-1', prices: { 'item-1': 1500 } });
  });

  it('sends a dish sold by variant as a price per variant', async () => {
    const { prices } = await renderEditor((catalogue) =>
      catalogue.items.set([
        catalogueItem({
          itemId: 'pizza',
          name: 'Pizza',
          price: undefined,
          variants: [
            { name: 'Margherita', description: '', price: 900 },
            { name: 'Pepperoni', description: '', price: 1200 },
          ],
        }),
      ]),
    );

    fireEvent.input(screen.getByLabelText('Pepperoni'), { target: { value: '14,00' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(prices.saved).toEqual({ marketId: 'market-1', prices: { pizza: { Pepperoni: 1400 } } });
  });

  // Empty is legal and means the market sells at the carte price throughout — the vendor
  // clears a market by emptying its fields, not by finding a delete button.
  it('sends an empty list when every field is blank', async () => {
    const { prices } = await renderEditor((catalogue, priced) => {
      catalogue.items.set([catalogueItem({ itemId: 'item-1', price: 1300 })]);
      priced.markets.set([{ marketId: 'market-1', prices: { 'item-1': 1500 } }]);
    });

    fireEvent.input(screen.getByLabelText('Bœuf bourguignon'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(prices.saved).toEqual({ marketId: 'market-1', prices: {} });
  });

  it('flags a price it cannot read', async () => {
    await renderEditor((catalogue) => catalogue.items.set([catalogueItem({ itemId: 'item-1', price: 1300 })]));

    fireEvent.input(screen.getByLabelText('Bœuf bourguignon'), { target: { value: 'quinze' } });

    expect(screen.getByRole('alert')).toHaveTextContent(/12,00/);
  });

  // Dropping it silently would send the dish back to its carte price — the vendor typed a
  // number, so saying nothing and charging less is the one outcome they cannot see coming.
  it('will not save while a price is unreadable', async () => {
    const { prices } = await renderEditor((catalogue) =>
      catalogue.items.set([catalogueItem({ itemId: 'item-1', price: 1300 })]),
    );

    fireEvent.input(screen.getByLabelText('Bœuf bourguignon'), { target: { value: 'quinze' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(prices.saved).toBeUndefined();
  });

  it('marks the rows this market already prices', async () => {
    await renderEditor((catalogue, prices) => {
      catalogue.items.set([
        catalogueItem({ itemId: 'item-1', name: 'Bœuf bourguignon', price: 1300 }),
        catalogueItem({ itemId: 'item-2', name: 'Tarte aux pommes', price: 650 }),
      ]);
      prices.markets.set([{ marketId: 'market-1', prices: { 'item-1': 1500 } }]);
    });

    expect(screen.getAllByText(/tarif marché/i)).toHaveLength(1);
  });

  it('counts the rows the vendor has changed on the save button', async () => {
    await renderEditor((catalogue) =>
      catalogue.items.set([
        catalogueItem({ itemId: 'item-1', name: 'Bœuf bourguignon', price: 1300 }),
        catalogueItem({ itemId: 'item-2', name: 'Tarte aux pommes', price: 650 }),
      ]),
    );

    fireEvent.input(screen.getByLabelText('Bœuf bourguignon'), { target: { value: '15,00' } });

    expect(screen.getByRole('button', { name: /enregistrer \(1\)/i })).toBeInTheDocument();
  });

  // A cleared row has nothing of its own left to show — the field is empty and the market
  // marker is gone — so the count is the only thing telling the vendor it is unsaved.
  it('counts a row cleared back to the carte price', async () => {
    await renderEditor((catalogue, prices) => {
      catalogue.items.set([catalogueItem({ itemId: 'item-1', price: 1300 })]);
      prices.markets.set([{ marketId: 'market-1', prices: { 'item-1': 1500 } }]);
    });

    fireEvent.input(screen.getByLabelText('Bœuf bourguignon'), { target: { value: '' } });

    expect(screen.getByRole('button', { name: /enregistrer \(1\)/i })).toBeInTheDocument();
  });

  it('counts nothing before the vendor changes anything', async () => {
    await renderEditor((catalogue, prices) => {
      catalogue.items.set([catalogueItem({ itemId: 'item-1', price: 1300 })]);
      prices.markets.set([{ marketId: 'market-1', prices: { 'item-1': 1500 } }]);
    });

    expect(screen.getByRole('button', { name: /^enregistrer$/i })).toBeInTheDocument();
  });

  it('names the market it is pricing', async () => {
    await renderEditor();

    expect(screen.getByText('Marché de Belleville')).toBeInTheDocument();
  });

  // A stale bookmark, or a schedule cancelled since. The domain refuses prices for a market
  // the vendor does not stand at, so a form here could only be typed into and rejected.
  it('says so when the market is no longer scheduled', async () => {
    await renderEditor((catalogue, prices, schedules) => {
      catalogue.items.set([catalogueItem({ itemId: 'item-1', price: 1300 })]);
      schedules.schedules.set([schedule('market-9', 'Marché d\'Aligre')]);
    });

    expect(screen.getByText(/n.est plus programmé/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enregistrer/i })).toBeNull();
  });

  // Schedules land after the first paint, so without gating the screen states, for a frame,
  // that a market the vendor stands at every week is no longer programmed.
  it('waits while the schedules are still arriving', async () => {
    await renderEditor((catalogue, prices, schedules) => {
      schedules.schedules.set([]);
      schedules.loading.set(true);
    });

    expect(screen.getByRole('status', { name: /chargement/i })).toBeInTheDocument();
    expect(screen.queryByText(/n.est plus programmé/i)).toBeNull();
  });

  it('keeps waiting while the catalogue is still arriving', async () => {
    await renderEditor((catalogue) => catalogue.loading.set(true));

    expect(screen.getByRole('status', { name: /chargement/i })).toBeInTheDocument();
  });

  // Rows seeded before the stored list lands would show every dish at its carte price, and
  // a vendor who typed into that would save over prices they never saw.
  it('keeps waiting while this market\'s prices are still arriving', async () => {
    await renderEditor((catalogue, prices) => {
      catalogue.items.set([catalogueItem({ itemId: 'item-1', price: 1300 })]);
      prices.loading.set(true);
    });

    expect(screen.getByRole('status', { name: /chargement/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Bœuf bourguignon')).toBeNull();
  });

  it('says the carte is empty when there is nothing to price', async () => {
    await renderEditor();

    expect(screen.getByText(/carte est vide/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enregistrer/i })).toBeNull();
  });
});
