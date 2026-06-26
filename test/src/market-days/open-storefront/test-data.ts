import { OpenStorefront } from '@market-monster/market-days';

export class TestOpenStorefront {
  static valid(): OpenStorefront {
    return new OpenStorefront('vendor-id');
  }

  static with(overrides: Partial<OpenStorefront>): OpenStorefront {
    const defaults = this.valid();
    return new OpenStorefront(overrides.vendorId ?? defaults.vendorId);
  }
}
