import { environment } from '../../environments/environment';
import { CustomerStorefront } from './customer-storefront';
import { CatalogueDish } from './dishes/catalogue-dish';
import { UpcomingMarket } from './markets/upcoming-market';

export type DishViewModel = {
  itemId: string;
  name: string;
  description: string;
  priceLabel: string;
  variants?: { name: string; description: string; priceLabel: string }[];
  photo: { cardUrl: string; sheetUrl: string } | null;
};

export type MarketViewModel = {
  weekday: string;
  day: string;
  month: string;
  marketName: string;
  hours: string;
  address: string;
  cancelled: boolean;
  inProgress: boolean;
  // Full dishes, so the featured card can render the same cards as the carte and open the
  // same sheet. The upcoming list draws only their names and prices.
  dishes: DishViewModel[];
};

export type StorefrontViewModel =
  | {
      status: 'published';
      name: string;
      description: string;
      phone: string;
      coverUrl: string | null;
      // Absolute Open Graph / Twitter card image, cropped to the 1200×630 the
      // crawlers expect — null when the vendor has no cover photo yet.
      socialImageUrl: string | null;
      dishes: DishViewModel[];
      upcomingMarkets: MarketViewModel[];
    }
  | {
      status: 'coming-soon';
      name: string | null;
    };

export function toViewModel(storefront: CustomerStorefront): StorefrontViewModel {
  if (storefront.status === 'coming-soon') {
    return storefront;
  }
  return {
    status: 'published',
    name: storefront.name,
    description: storefront.description,
    phone: storefront.phone,
    coverUrl: storefront.coverPhoto ? cloudinaryUrl(storefront.coverPhoto, 'c_fill,w_1200,h_750,q_auto,f_auto') : null,
    socialImageUrl: storefront.coverPhoto ? cloudinaryUrl(storefront.coverPhoto, 'c_fill,w_1200,h_630,q_auto,f_auto') : null,
    dishes: storefront.dishes.map(toDishViewModel),
    upcomingMarkets: storefront.upcomingMarkets.map(toMarketViewModel),
  };
}

function cloudinaryUrl(reference: string, transform: string): string {
  return `https://res.cloudinary.com/${environment.cloudinary.cloudName}/image/upload/${transform}/${reference}`;
}

function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

// One mapping for both the carte and a market day's menu — they are the same catalogue
// items, and a dish must not read differently depending on which section it lands in.
function toDishViewModel(dish: CatalogueDish): DishViewModel {
  const photo = dish.imageReference
    ? {
        cardUrl: cloudinaryUrl(dish.imageReference, 'c_fill,w_800,h_500,q_auto,f_auto'),
        sheetUrl: cloudinaryUrl(dish.imageReference, 'c_fill,w_1200,h_900,q_auto,f_auto'),
      }
    : null;
  const base = { itemId: dish.itemId, name: dish.name, description: dish.description, photo, priceLabel: priceLabelFor(dish) };
  return dish.variants
    ? {
        ...base,
        variants: dish.variants.map(variant => ({ name: variant.name, description: variant.description, priceLabel: formatEuros(variant.price) })),
      }
    : base;
}

function priceLabelFor(dish: CatalogueDish): string {
  return dish.variants
    ? `dès ${formatEuros(Math.min(...dish.variants.map(variant => variant.price)))}`
    : formatEuros(dish.price ?? 0);
}

// ponytail: French single-region labels, keyed off the DTO's own weekday + date parts
// (no Date parsing → no timezone drift). Localise via Intl only when a second locale appears.
const WEEKDAYS: Record<string, string> = { MON: 'LUN', TUE: 'MAR', WED: 'MER', THU: 'JEU', FRI: 'VEN', SAT: 'SAM', SUN: 'DIM' };
const MONTHS = ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];

function toMarketViewModel(market: UpcomingMarket): MarketViewModel {
  const [, month, day] = market.date.split('-');
  return {
    weekday: WEEKDAYS[market.weekday] ?? market.weekday,
    day: String(Number(day)),
    month: MONTHS[Number(month) - 1] ?? '',
    marketName: market.marketName,
    hours: marketHours(market),
    address: [market.street, market.town].filter(Boolean).join(', '),
    cancelled: market.cancelled,
    inProgress: market.inProgress,
    dishes: market.dishes.map(toDishViewModel),
  };
}

function marketHours(market: UpcomingMarket): string {
  const start = formatHour(market.startTime);
  const end = formatHour(market.endTime);
  return start && end ? `${start} – ${end}` : start || end;
}

function formatHour(time?: string): string {
  if (!time) {
    return '';
  }
  const [hour, minute] = time.split(':');
  return minute === '00' ? `${Number(hour)}h` : `${Number(hour)}h${minute}`;
}
