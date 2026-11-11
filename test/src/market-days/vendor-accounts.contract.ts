import { beforeEach, describe, expect, it } from 'vitest';
import { Invitation, VendorAccounts } from '@market-miam/market-days';

const marie: Invitation = { vendorId: 'vendor-id', email: 'marie@example.fr' };

export function vendorAccountsContract(name: string, create: () => VendorAccounts): void {
  describe(`VendorAccounts contract: ${name}`, () => {
    let accounts: VendorAccounts;

    beforeEach(() => {
      accounts = create();
    });

    it('answers open for a new invitation', async () => {
      expect(await accounts.ensureOpenFor(marie)).toBe('open');
    });

    it("answers email-in-use when the email holds another vendor's account", async () => {
      await accounts.ensureOpenFor(marie);

      expect(await accounts.ensureOpenFor({ ...marie, vendorId: 'another-vendor' })).toBe('email-in-use');
    });
  });
}
