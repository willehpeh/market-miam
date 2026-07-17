export class StorefrontDescription {

  private readonly _description: string

  constructor(description: string) {
    this._description = description.trim();
  }

  value(): string {
    return this._description;
  }

  hasContent(): boolean {
    return this._description.length > 0;
  }

}
