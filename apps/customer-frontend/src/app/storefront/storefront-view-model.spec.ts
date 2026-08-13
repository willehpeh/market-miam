import { StorefrontViewModel, toViewModel } from './storefront-view-model';
import { CustomerStorefront } from './customer-storefront';

describe('toViewModel', () => {
  // One crop, a ladder of widths: the card and the sheet render the same candidates, so
  // opening the sheet finds the photo the card already loaded in the browser cache instead
  // of flashing the previous dish while a second URL downloads.
  it('builds a single srcset ladder per dish photo, shared by the card and the sheet', () => {
    const storefront: CustomerStorefront = {
      status: 'published',
      name: 'Chez Test',
      description: '',
      phone: '',
      coverPhoto: null,
      upcomingMarkets: [],
      dishes: [{ itemId: 'boeuf', name: 'Bourguignon', description: '', price: 1300, imageReference: 'v1/boeuf' }],
    };

    const view = toViewModel(storefront) as Extract<StorefrontViewModel, { status: 'published' }>;

    expect(view.dishes[0].photo).toEqual({
      src: 'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_800,h_600,q_auto,f_auto/v1/boeuf',
      srcset: [
        'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_400,h_300,q_auto,f_auto/v1/boeuf 400w',
        'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_800,h_600,q_auto,f_auto/v1/boeuf 800w',
        'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_1200,h_900,q_auto,f_auto/v1/boeuf 1200w',
        'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_1600,h_1200,q_auto,f_auto/v1/boeuf 1600w',
      ].join(', '),
    });
  });

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
    expect(dish.photo).toBeNull();
    expect(dish.variants).toEqual([
      { name: 'Margherita', description: '', priceLabel: '9,00 €' },
      { name: 'Pepperoni', description: 'spicy', priceLabel: '12,00 €' },
    ]);
  });

  // The menu is the day's offering, so it carries names and prices — the carte below
  // already has the photos and the descriptions.
  it('lists a market day\'s menu with the same price labels as the carte', () => {
    const storefront: CustomerStorefront = {
      status: 'published',
      name: 'Chez Test',
      description: '',
      phone: '',
      coverPhoto: null,
      dishes: [],
      upcomingMarkets: [
        {
          date: '2026-06-18',
          weekday: 'THU',
          marketName: 'Marché Saint-Antoine',
          postalCode: '69002',
          town: 'Lyon',
          cancelled: false,
          inProgress: false,
          dishes: [
            { itemId: 'boeuf', name: 'Bourguignon', description: '', price: 1300, imageReference: '' },
            {
              itemId: 'pizza',
              name: 'Pizza',
              description: '',
              imageReference: '',
              variants: [{ name: 'Margherita', description: '', price: 900 }],
            },
          ],
        },
      ],
    };

    const view = toViewModel(storefront) as Extract<StorefrontViewModel, { status: 'published' }>;

    expect(view.upcomingMarkets[0].dishes).toEqual([
      { itemId: 'boeuf', name: 'Bourguignon', description: '', priceLabel: '13,00 €', photo: null },
      {
        itemId: 'pizza',
        name: 'Pizza',
        description: '',
        priceLabel: 'dès 9,00 €',
        photo: null,
        variants: [{ name: 'Margherita', description: '', priceLabel: '9,00 €' }],
      },
    ]);
  });
});
