import { describe, expect, it } from 'vitest';
import { Invitation, VendorAccount, VendorAccounts } from '@market-miam/market-days';

const marie: Invitation = { vendorId: 'vendor-id', email: 'marie@example.fr' };

export function vendorAccountsContract(name: string, create: (existing: VendorAccount[]) => VendorAccounts): void {
  describe(`VendorAccounts contract: ${name}`, () => {
    const given = (...existing: VendorAccount[]): VendorAccounts => create(existing);

    it('answers open for a new invitation', async () => {
      expect(await given().openFor(marie)).toBe('open');
    });

    // A retry after a half-finished run finds the account it opened.
    it("answers open when the email already holds this vendor's account", async () => {
      expect(await given({ email: marie.email, vendorId: marie.vendorId }).openFor(marie)).toBe('open');
    });

    it("answers email-in-use when the email holds another vendor's account", async () => {
      expect(await given({ email: marie.email, vendorId: 'another-vendor' }).openFor(marie)).toBe('email-in-use');
    });

    it('answers email-in-use when the email holds an account made by hand, with no vendorId', async () => {
      expect(await given({ email: marie.email, vendorId: null }).openFor(marie)).toBe('email-in-use');
    });
  });
}
