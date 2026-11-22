// An amount in euros, held in cents as the API carries it.
export class Euros {
  private constructor(private readonly cents: number) {
    if (!Number.isInteger(cents) || cents < 0) {
      throw new Error(`Not an amount in cents: ${cents}`);
    }
  }

  static ofCents(cents: number): Euros {
    return new Euros(cents);
  }

  // What a vendor types into a price field: whole euros, or up to two decimals after a comma
  // or a point. Anything else does not read as an amount.
  static parse(typed: string): Euros | null {
    const normalized = typed.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      return null;
    }
    return new Euros(Math.round(parseFloat(normalized) * 100));
  }

  inCents(): number {
    return this.cents;
  }

  // As a price field shows it, ready to be typed over: "12,50".
  asTyped(): string {
    return (this.cents / 100).toFixed(2).replace('.', ',');
  }

  // A no-break space before the € — French typography wants one, and it keeps the amount
  // whole, so a cramped row breaks after "dès" instead of between the digits and the sign.
  label(): string {
    return `${this.asTyped()}\u00a0€`;
  }

  isBelow(other: Euros): boolean {
    return this.cents < other.cents;
  }
}
