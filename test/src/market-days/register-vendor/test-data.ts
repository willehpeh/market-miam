import { RegisterVendor } from '@market-monster/market-days';

export class TestRegisterVendor {
  static valid(): RegisterVendor {
    return new RegisterVendor(
      'vendor-id',
      '2026-06-13T20:33:19.632Z',
      'vendor@domain.com',
    );
  }

  static with(overrides: Partial<RegisterVendor>): RegisterVendor {
    const defaults = this.valid();
    return new RegisterVendor(
      overrides.vendorId ?? defaults.vendorId,
      overrides.registeredAt ?? defaults.registeredAt,
      overrides.email ?? defaults.email,
    );
  }
}
