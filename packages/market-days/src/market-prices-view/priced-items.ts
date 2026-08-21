import { MarketPrice } from '../catalogue/item';
import { PriceList } from '../calendar';
import { CatalogueViewItem } from '../catalogue-view/catalogue-view';

// What a market charges, substituted for the catalogue's default. Everything else about a
// dish — its name, description, photo and place in the order — still comes from the
// catalogue, so a revision keeps reaching days already planned.
//
// Lenient by design (ADR 0052): a price whose shape no longer matches the dish is ignored
// rather than raised. Writes are where a mismatch is refused; by the time a vendor has
// flipped a dish between flat and variant, the old override is stale and the catalogue
// price is the honest answer.
export function priced(items: CatalogueViewItem[], prices: PriceList): CatalogueViewItem[] {
  return items.map(item => atMarketPrice(item, prices[item.itemId]));
}

function atMarketPrice(item: CatalogueViewItem, price: MarketPrice | undefined): CatalogueViewItem {
  if (price === undefined) {
    return item;
  }
  if (typeof price === 'number') {
    return item.variants ? item : { ...item, price };
  }
  return item.variants
    ? { ...item, variants: item.variants.map(variant => ({ ...variant, price: price[variant.name] ?? variant.price })) }
    : item;
}
