import { environment } from '../../environments/environment';
import { CustomerStorefront } from './customer-storefront';
import { CatalogueItem } from './items/catalogue-item';
import { UpcomingMarket } from './markets/upcoming-market';

export type ItemViewModel = {
  itemId: string;
  name: string;
  description: string;
  priceLabel: string;
  variants?: { name: string; description: string; priceLabel: string }[];
  photo: { src: string; srcset: string } | null;
  // Only ever set on a market day's items — the carte has no availability to speak of.
  // A variant dish greys whole (decision 9).
  soldOut?: boolean;
};

export type MarketViewModel = {
  // The day itself, kept so a market can be tracked by which market it is rather than by
  // where it sits in the list: the live poll rebuilds this array every minute, and a
  // positional key rebinds every card below a day that drops off.
  date: string;
  weekday: string;
  day: string;
  month: string;
  marketName: string;
  hours: string;
  address: string;
  cancelled: boolean;
  inProgress: boolean;
  // Full items, so the featured card can render the same cards as the carte and open the
  // same sheet. The upcoming list draws only their names and prices.
  items: ItemViewModel[];
};

export type StorefrontViewModel =
  | {
      status: 'published';
      name: string;
      description: string;
      phone: string;
      coverReference: string | null;
      // Absolute Open Graph / Twitter card image, cropped to the 1200×630 the
      // crawlers expect — null when the vendor has no cover photo yet.
      socialImageUrl: string | null;
      items: ItemViewModel[];
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
    coverReference: storefront.coverPhoto,
    socialImageUrl: storefront.coverPhoto ? cloudinaryUrl(storefront.coverPhoto, 'c_fill,w_1200,h_630,q_auto,f_auto') : null,
    items: storefront.items.map(toItemViewModel),
    upcomingMarkets: storefront.upcomingMarkets.map(toMarketViewModel),
  };
}

function cloudinaryUrl(reference: string, transform: string): string {
  return `https://res.cloudinary.com/${environment.cloudinary.cloudName}/image/upload/${transform}/${reference}`;
}

// One 4:3 crop in a ladder of widths, and the browser picks per slot. The card and the
// sheet share the candidates, so opening a sheet reuses the photo its card already
// loaded — a second hand-picked URL here is what made the sheet flash the previous item.
const ITEM_PHOTO_WIDTHS = [400, 800, 1200, 1600];

function itemPhoto(reference: string): { src: string; srcset: string } {
  const candidate = (width: number) => cloudinaryUrl(reference, `c_fill,w_${width},h_${(width * 3) / 4},q_auto,f_auto`);
  return {
    src: candidate(800),
    srcset: ITEM_PHOTO_WIDTHS.map((width) => `${candidate(width)} ${width}w`).join(', '),
  };
}

function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

// One mapping for both the carte and a market day's menu — they are the same catalogue
// items, and an item must not read differently depending on which section it lands in.
function toItemViewModel(item: CatalogueItem): ItemViewModel {
  const photo = item.imageReference ? itemPhoto(item.imageReference) : null;
  const base = { itemId: item.itemId, name: item.name, description: item.description, photo, priceLabel: priceLabelFor(item) };
  return item.variants
    ? {
        ...base,
        variants: item.variants.map(variant => ({ name: variant.name, description: variant.description, priceLabel: formatEuros(variant.price) })),
      }
    : base;
}

function priceLabelFor(item: CatalogueItem): string {
  return item.variants
    ? `dès ${formatEuros(Math.min(...item.variants.map(variant => variant.price)))}`
    : formatEuros(item.price ?? 0);
}

// ponytail: French single-region labels, keyed off the DTO's own weekday + date parts
// (no Date parsing → no timezone drift). Localise via Intl only when a second locale appears.
const WEEKDAYS: Record<string, string> = { MON: 'LUN', TUE: 'MAR', WED: 'MER', THU: 'JEU', FRI: 'VEN', SAT: 'SAM', SUN: 'DIM' };
const MONTHS = ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];

function toMarketViewModel(market: UpcomingMarket): MarketViewModel {
  const [, month, day] = market.date.split('-');
  return {
    date: market.date,
    weekday: WEEKDAYS[market.weekday] ?? market.weekday,
    day: String(Number(day)),
    month: MONTHS[Number(month) - 1] ?? '',
    marketName: market.marketName,
    hours: marketHours(market),
    address: [market.street, market.town].filter(Boolean).join(', '),
    cancelled: market.cancelled,
    inProgress: market.inProgress,
    // Flagged in place, never re-sorted: shuffling rows under a reader's thumb is worse
    // than a dead row (decision 7).
    items: market.items.map(item => ({ ...toItemViewModel(item), soldOut: market.soldOutItemIds.includes(item.itemId) })),
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
