import { StorefrontViewModel, toViewModel } from './storefront-view-model';
import { CustomerStorefront } from './customer-storefront';

describe('toViewModel', () => {
  it('labels a variant dish "dès {min}" and maps each variant', () => {
    const storefront: CustomerStorefront = {
      status: 'published',
      name: 'Chez Test',
      description: '',
      phone: '',
      coverPhoto: null,
      upcomingMarkets: [],
      dishes: [
        {
          itemId: 'pizza',
          name: 'Pizza',
          description: 'Wood-fired',
          imageReference: '',
          variants: [
            { name: 'Margherita', description: '', price: 900 },
            { name: 'Pepperoni', description: 'spicy', price: 1200 },
          ],
        },
      ],
    };

    const view = toViewModel(storefront) as Extract<StorefrontViewModel, { status: 'published' }>;
    const dish = view.dishes[0];

    expect(dish.priceLabel).toBe('dès 9,00 €');
    expect(dish.variants).toEqual([
      { name: 'Margherita', description: '', priceLabel: '9,00 €' },
      { name: 'Pepperoni', description: 'spicy', priceLabel: '12,00 €' },
    ]);
  });
});
