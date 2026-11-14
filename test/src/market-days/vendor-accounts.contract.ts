import { describe, expect, it } from 'vitest';
import { Invitation, VendorAccount, VendorAccounts } from '@market-miam/market-days';

// example.com is reserved for examples (RFC 2606): safe should a real tenant ever mail it.
const marie: Invitation = { vendorId: 'vendor-id', email: 'marie@example.com' };
// Her vendorId contains Marie's, as a near match in a full-text search would.
const rose: Invitation = { vendorId: `${marie.vendorId}-2`, email: 'rose@example.com' };

// Every address the contract opens or expects, for adapters on real infrastructure to clear.
export const vendorAccountsContractEmails: readonly string[] = [marie.email, rose.email];

export function vendorAccountsContract(
  name: string,
  create: (existing: VendorAccount[]) => VendorAccounts | Promise<VendorAccounts>,
): void {
  describe(`VendorAccounts contract: ${name}`, () => {
    const given = async (...existing: VendorAccount[]): Promise<VendorAccounts> => create(existing);

    it('answers open for a new invitation', async () => {
      const accounts = await given();

      expect(await accounts.openFor(marie)).toBe('open');
    });

    // A retry after a half-finished run finds the account it opened.
    it("answers open when the email already holds this vendor's account", async () => {
      const accounts = await given({ email: marie.email, vendorId: marie.vendorId });

      expect(await accounts.openFor(marie)).toBe('open');
    });

    it("answers email-in-use when the email holds another vendor's account", async () => {
      const accounts = await given({ email: marie.email, vendorId: 'another-vendor' });

      expect(await accounts.openFor(marie)).toBe('email-in-use');
    });

    it('answers email-in-use when the email holds an account made by hand, with no vendorId', async () => {
      const accounts = await given({ email: marie.email, vendorId: null });

      expect(await accounts.openFor(marie)).toBe('email-in-use');
    });

    // Erasure frees the address: the account that held it is gone (ADR 0063).
    it("closes the vendor's account", async () => {
      const accounts = await given({ email: marie.email, vendorId: marie.vendorId });

      await accounts.closeFor({ vendorId: marie.vendorId });

      expect(await accounts.openFor({ vendorId: 'another-vendor', email: marie.email })).toBe('open');
    });

    it("closes no account but the vendor's own", async () => {
      const accounts = await given(
        { email: marie.email, vendorId: marie.vendorId },
        { email: rose.email, vendorId: rose.vendorId },
      );

      await accounts.closeFor({ vendorId: marie.vendorId });

      expect(await accounts.openFor({ vendorId: 'another-vendor', email: rose.email })).toBe('email-in-use');
    });
  });
}
