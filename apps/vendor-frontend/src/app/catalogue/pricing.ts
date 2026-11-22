import { Euros } from '../core/euros';
import { MarketPrice } from '../market-prices/market-prices';
import { VariantView } from './catalogue';

export type PricingValue = { price: number } | { variants: VariantView[] };

export class Variant {
  constructor(
    private readonly _name: string,
    private readonly _description: string,
    private readonly _price: Euros,
  ) {}

  static of(view: VariantView): Variant {
    return new Variant(view.name, view.description, Euros.ofCents(view.price));
  }

  name(): string {
    return this._name;
  }

  description(): string {
    return this._description;
  }

  price(): Euros {
    return this._price;
  }

  value(): VariantView {
    return { name: this._name, description: this._description, price: this._price.inCents() };
  }
}

// One price a dish carries, as one market charges it: the carte's, unless the market names
// its own.
export class MarketRow {
  constructor(
    private readonly _variant: string | null,
    private readonly _carte: Euros,
    private readonly _market: Euros | undefined,
  ) {}

  // The variant it prices, or null for a flat dish's one price.
  variant(): string | null {
    return this._variant;
  }

  carte(): Euros {
    return this._carte;
  }

  market(): Euros | undefined {
    return this._market;
  }

  charged(): Euros {
    return this._market ?? this._carte;
  }
}

export interface Quote {
  label: string;
  setByMarket: boolean;
}

// A dish is flat-priced or sold by variant, never both (ADR 0033), so the two kinds answer
// for themselves, as the domain's Pricing does.
export abstract class Pricing {
  // The API answers with one of the two; a dish with neither breaks the domain's own rule.
  static of(item: { price?: number; variants?: VariantView[] }): Pricing {
    if (item.variants) {
      return new VariantPricing(item.variants.map((variant) => Variant.of(variant)));
    }
    if (item.price === undefined) {
      throw new Error('A dish is priced flat or by variant');
    }
    return new FlatPricing(Euros.ofCents(item.price));
  }

  static flat(price: Euros): Pricing {
    return new FlatPricing(price);
  }

  static byVariant(variants: Variant[]): Pricing {
    return new VariantPricing(variants);
  }

  abstract isFlat(): this is FlatPricing;

  abstract isSoldByVariant(): this is VariantPricing;

  // None for a flat dish.
  abstract variants(): readonly Variant[];

  // One row per price the dish carries. A market price whose shape disagrees with the dish
  // is ignored rather than shown, the answer the read side already gives it: the vendor
  // sees the carte price and can retype.
  abstract marketRows(market: MarketPrice | undefined): MarketRow[];

  // What the vendor typed, one per row of marketRows and in its order. A blank row sells at
  // the carte price, and a dish with every row blank has no market price at all.
  abstract marketPriceFrom(typed: readonly (Euros | null)[]): MarketPrice | undefined;

  abstract value(): PricingValue;

  protected abstract labelFor(cheapest: Euros): string;

  label(): string {
    return this.quoteAt(undefined).label;
  }

  // The cheapest row is what the dish is quoted at, and whether the market set it.
  quoteAt(market: MarketPrice | undefined): Quote {
    const cheapest = this.marketRows(market).reduce((lowest, row) =>
      row.charged().isBelow(lowest.charged()) ? row : lowest,
    );
    return { label: this.labelFor(cheapest.charged()), setByMarket: cheapest.market() !== undefined };
  }
}

class FlatPricing extends Pricing {
  constructor(private readonly _price: Euros) {
    super();
  }

  price(): Euros {
    return this._price;
  }

  isFlat(): this is FlatPricing {
    return true;
  }

  isSoldByVariant(): this is VariantPricing {
    return false;
  }

  variants(): readonly Variant[] {
    return [];
  }

  marketRows(market: MarketPrice | undefined): MarketRow[] {
    return [new MarketRow(null, this._price, typeof market === 'number' ? Euros.ofCents(market) : undefined)];
  }

  marketPriceFrom([typed]: readonly (Euros | null)[]): MarketPrice | undefined {
    return typed?.inCents();
  }

  value(): PricingValue {
    return { price: this._price.inCents() };
  }

  protected labelFor(cheapest: Euros): string {
    return cheapest.label();
  }
}

class VariantPricing extends Pricing {
  constructor(private readonly _variants: readonly Variant[]) {
    super();
  }

  isFlat(): this is FlatPricing {
    return false;
  }

  isSoldByVariant(): this is VariantPricing {
    return true;
  }

  variants(): readonly Variant[] {
    return this._variants;
  }

  marketRows(market: MarketPrice | undefined): MarketRow[] {
    return this._variants.map((variant) => {
      const named = typeof market === 'object' ? market[variant.name()] : undefined;
      return new MarketRow(variant.name(), variant.price(), named === undefined ? undefined : Euros.ofCents(named));
    });
  }

  marketPriceFrom(typed: readonly (Euros | null)[]): MarketPrice | undefined {
    const priced = this._variants.flatMap((variant, row): [string, number][] => {
      const price = typed[row];
      return price ? [[variant.name(), price.inCents()]] : [];
    });
    return priced.length ? Object.fromEntries(priced) : undefined;
  }

  value(): PricingValue {
    return { variants: this._variants.map((variant) => variant.value()) };
  }

  // The newline is load-bearing: the carte keeps it (whitespace-pre), so "dès" sits on its
  // own line and the price column stays as narrow as its widest price. A row that does not
  // keep whitespace reads it as a space.
  protected labelFor(cheapest: Euros): string {
    return `dès\n${cheapest.label()}`;
  }
}
