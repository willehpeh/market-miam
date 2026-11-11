import { InviteVendor } from '@market-miam/market-days';

export class TestInviteVendor {
  static valid(): InviteVendor {
    return new InviteVendor(
      'vendor-id',
      '2026-11-11T09:00:00.000Z',
      'marie@example.fr',
    );
  }

  static with(overrides: Partial<InviteVendor>): InviteVendor {
    const defaults = this.valid();
    return new InviteVendor(
      overrides.vendorId ?? defaults.vendorId,
      overrides.invitedAt ?? defaults.invitedAt,
      overrides.email ?? defaults.email,
    );
  }
}
