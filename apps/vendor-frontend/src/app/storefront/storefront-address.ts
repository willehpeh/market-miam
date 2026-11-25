// Where the vitrine is found on the web: its subdomain under the storefronts' base domain.
export class StorefrontAddress {
  private constructor(
    private readonly _subdomain: string,
    private readonly baseDomain: string,
  ) {}

  // None until an operator assigns the vendor a subdomain (ADR 0065).
  static of(subdomain: string | null | undefined, baseDomain: string): StorefrontAddress | null {
    return subdomain ? new StorefrontAddress(subdomain, baseDomain) : null;
  }

  subdomain(): string {
    return this._subdomain;
  }

  // The address as a vendor reads it out: "margaux.marketmiam.fr".
  label(): string {
    return `${this._subdomain}.${this.baseDomain}`;
  }

  href(): string {
    return `https://${this.label()}`;
  }
}
