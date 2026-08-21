import { StorefrontViewModel, toViewModel } from './storefront-view-model';
import { CustomerStorefront } from './customer-storefront';

describe('toViewModel', () => {
  // The carte is tied to no market, so there is no one price it could name: the same dish
  // sells for different money depending on where the vendor is standing.
  it('gives a carte item no price', () => {
    const storefront: CustomerStorefront = {
      status: 'published',
      name: 'Chez Test',
      description: '',
      phone: '',
      coverPhoto: null,
      upcomingMarkets: [],
      items: [{ itemId: 'boeuf', name: 'Bourguignon', description: '', price: 1300, imageReference: '' }],
    };

    const view = toViewModel(storefront) as Extract<StorefrontViewModel, { status: 'published' }>;

    expect(view.items[0].priceLabel).toBeUndefined();
  });

  // One crop, a ladder of widths: the card and the sheet render the same candidates, so
  // opening the sheet finds the photo the card already loaded in the browser cache instead
  // of flashing the previous item while a second URL downloads.
  it('builds a single srcset ladder per item photo, shared by the card and the sheet', () => {
    const storefront: CustomerStorefront = {
      status: 'published',
      name: 'Chez Test',
      description: '',
      phone: '',
      coverPhoto: null,
      upcomingMarkets: [],
      items: [{ itemId: 'boeuf', name: 'Bourguignon', description: '', price: 1300, imageReference: 'v1/boeuf' }],
    };

    const view = toViewModel(storefront) as Extract<StorefrontViewModel, { status: 'published' }>;

    expect(view.items[0].photo).toEqual({
      src: 'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_800,h_600,q_auto,f_auto/v1/boeuf',
      srcset: [
        'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_400,h_300,q_auto,f_auto/v1/boeuf 400w',
        'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_800,h_600,q_auto,f_auto/v1/boeuf 800w',
        'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_1200,h_900,q_auto,f_auto/v1/boeuf 1200w',
        'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_1600,h_1200,q_auto,f_auto/v1/boeuf 1600w',
      ].join(', '),
    });
  });

  it('maps each variant of a carte item, without pricing any of them', () => {
    const storefront: CustomerStorefront = {
      status: 'published',
      name: 'Chez Test',
      description: '',
      phone: '',
      coverPhoto: null,
      upcomingMarkets: [],
      items: [
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
    const item = view.items[0];

    expect(item.priceLabel).toBeUndefined();
    expect(item.photo).toBeNull();
    expect(item.variants).toEqual([
      { name: 'Margherita', description: '' },
      { name: 'Pepperoni', description: 'spicy' },
    ]);
  });

  // A market that is trading is the one place a price is unambiguous: the customer is at
  // that stall, and that stall's list is what they will be charged.
  it('prices a market day\'s menu while the market is trading', () => {
    const storefront: CustomerStorefront = {
      status: 'published',
      name: 'Chez Test',
      description: '',
      phone: '',
      coverPhoto: null,
      items: [],
      upcomingMarkets: [
        {
          date: '2026-06-18',
          weekday: 'THU',
          marketName: 'Marché Saint-Antoine',
          postalCode: '69002',
          town: 'Lyon',
          cancelled: false,
          inProgress: true,
          items: [
            { itemId: 'boeuf', name: 'Bourguignon', description: '', price: 1300, imageReference: '' },
            {
              itemId: 'pizza',
              name: 'Pizza',
              description: '',
              imageReference: '',
              variants: [{ name: 'Margherita', description: '', price: 900 }],
            },
          ],
          soldOutItemIds: ['pizza'],
        },
      ],
    };

    const view = toViewModel(storefront) as Extract<StorefrontViewModel, { status: 'published' }>;

    expect(view.upcomingMarkets[0].items).toEqual([
      { itemId: 'boeuf', name: 'Bourguignon', description: '', priceLabel: '13,00 €', photo: null, soldOut: false },
      {
        itemId: 'pizza',
        name: 'Pizza',
        description: '',
        priceLabel: 'dès 9,00 €',
        photo: null,
        variants: [{ name: 'Margherita', description: '', priceLabel: '9,00 €' }],
        // A variant dish greys whole (decision 9): sold-out is per item until a pilot
        // vendor puts a variant dish on a live menu.
        soldOut: true,
      },
    ]);
    // The carte carries no availability — soldOut is a market-day fact only.
    expect(view.items.every(item => item.soldOut === undefined)).toBe(true);
  });

  // Thursday's card is a plan, not a till. The prices it would quote are today's, and a
  // vendor who reprices that market before Thursday would have shown a number they never
  // meant to charge.
  it('leaves a market day\'s menu unpriced until the market is trading', () => {
    const storefront: CustomerStorefront = {
      status: 'published',
      name: 'Chez Test',
      description: '',
      phone: '',
      coverPhoto: null,
      items: [],
      upcomingMarkets: [
        {
          date: '2026-06-18',
          weekday: 'THU',
          marketName: 'Marché Saint-Antoine',
          postalCode: '69002',
          town: 'Lyon',
          cancelled: false,
          inProgress: false,
          items: [{ itemId: 'boeuf', name: 'Bourguignon', description: '', price: 1300, imageReference: '' }],
          soldOutItemIds: [],
        },
      ],
    };

    const view = toViewModel(storefront) as Extract<StorefrontViewModel, { status: 'published' }>;

    expect(view.upcomingMarkets[0].items[0].priceLabel).toBeUndefined();
  });
});
