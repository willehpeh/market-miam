import { StorefrontViewModel, toViewModel } from './storefront-view-model';
import { CustomerStorefront } from './customer-storefront';

type PublishedStorefront = Extract<CustomerStorefront, { status: 'published' }>;
type Market = PublishedStorefront['upcomingMarkets'][number];

const dish = { itemId: 'boeuf', name: 'Bourguignon', description: '', price: 1300, imageReference: '' };

const market = (date: string, marketName: string, items: Market['items']): Market => ({
  date,
  weekday: 'THU',
  marketName,
  postalCode: '69002',
  town: 'Lyon',
  cancelled: false,
  inProgress: false,
  items,
  soldOutItemIds: [],
});

const withMarkets = (upcomingMarkets: Market[]): CustomerStorefront => ({
  status: 'published',
  name: 'Chez Test',
  description: '',
  phone: '',
  coverPhoto: null,
  cartePricesVisible: true,
  items: [],
  upcomingMarkets,
});

describe('toViewModel', () => {
  // The vendor's choice, and they are opted in. A carte is tied to no market, so the figure
  // it names is the catalogue's — what a dish costs before any market's own list revises it.
  it('prices a carte item when the vendor shows carte prices', () => {
    const storefront: CustomerStorefront = {
      status: 'published',
      name: 'Chez Test',
      description: '',
      phone: '',
      coverPhoto: null,
      cartePricesVisible: true,
      upcomingMarkets: [],
      items: [dish],
    };

    const view = toViewModel(storefront) as Extract<StorefrontViewModel, { status: 'published' }>;

    expect(view.items[0].priceLabel).toBe('13,00 €');
  });

  it('gives a carte item no price when the vendor has hidden them', () => {
    const storefront: CustomerStorefront = {
      status: 'published',
      name: 'Chez Test',
      description: '',
      phone: '',
      coverPhoto: null,
      cartePricesVisible: false,
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
      cartePricesVisible: true,
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

  // The variant dish's two figures: the dish names its cheapest as a dès, each variant
  // names its own. Same shape the featured market's menu draws, at catalogue prices.
  it('prices every variant of a carte item when prices are shown', () => {
    const storefront: CustomerStorefront = {
      status: 'published',
      name: 'Chez Test',
      description: '',
      phone: '',
      coverPhoto: null,
      cartePricesVisible: true,
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

    expect(item.priceLabel).toBe('dès 9,00 €');
    expect(item.variants).toEqual([
      { name: 'Margherita', description: '', priceLabel: '9,00 €' },
      { name: 'Pepperoni', description: 'spicy', priceLabel: '12,00 €' },
    ]);
  });

  it('maps each variant of a carte item, pricing none of them when prices are hidden', () => {
    const storefront: CustomerStorefront = {
      status: 'published',
      name: 'Chez Test',
      description: '',
      phone: '',
      coverPhoto: null,
      cartePricesVisible: false,
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
      cartePricesVisible: true,
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

  // The featured card is where the trip is decided — before leaving home, which is exactly
  // when a price is worth knowing and used to be hidden. Priced whether or not the market
  // is trading yet.
  it("prices the featured market's menu, trading or not", () => {
    const storefront = withMarkets([
      market('2026-06-18', 'Marché Saint-Antoine', [dish]),
    ]);

    const view = toViewModel(storefront) as Extract<StorefrontViewModel, { status: 'published' }>;

    expect(view.upcomingMarkets[0].inProgress).toBe(false);
    expect(view.upcomingMarkets[0].items[0].priceLabel).toBe('13,00 €');
  });

  // Only the featured card. The days below it are a schedule, not a menu — pricing all five
  // puts the same catalogue on the page five times over, each with its own numbers.
  it('leaves the markets below the featured one unpriced', () => {
    const storefront = withMarkets([
      market('2026-06-18', 'Marché Saint-Antoine', [dish]),
      market('2026-06-20', 'Marché de la Croix-Rousse', [dish]),
    ]);

    const view = toViewModel(storefront) as Extract<StorefrontViewModel, { status: 'published' }>;

    expect(view.upcomingMarkets[0].items[0].priceLabel).toBe('13,00 €');
    expect(view.upcomingMarkets[1].items[0].priceLabel).toBeUndefined();
  });
});
