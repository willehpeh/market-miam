import { render, screen } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PriceEditor } from './price-editor';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { catalogueItem } from '../catalogue/catalogue-item.builder';
import { MarketPricesFacade } from './market-prices.facade';
import { FakeMarketPricesFacade } from './fake.market-prices.facade';

async function renderEditor(
  setup: (catalogue: FakeCatalogueFacade, prices: FakeMarketPricesFacade) => void = () => undefined,
) {
  const catalogue = new FakeCatalogueFacade();
  const prices = new FakeMarketPricesFacade();
  setup(catalogue, prices);
  const view = await render(PriceEditor, {
    providers: [
      provideRouter([]),
      { provide: CatalogueFacade, useValue: catalogue },
      { provide: MarketPricesFacade, useValue: prices },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ marketId: 'market-1' }) } },
      },
    ],
  });
  return { view, catalogue, prices };
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
});
