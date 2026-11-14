import { Email } from '@market-miam/common';
import { InvalidTokenError, TokenVerifier, type VerifiedVendor } from '@market-miam/auth';
import { VendorId } from '@market-miam/shared-kernel';

// Signs in whichever vendor the token names, as `vendor:<vendorId>:<email>`: a scenario's
// vendor is minted by their invitation, so no token can be fixed before it.
export class NamingTokenVerifier extends TokenVerifier {
  static tokenFor(vendorId: string, email: string): string {
    return `vendor:${vendorId}:${email}`;
  }

  verify(bearerToken: string): Promise<VerifiedVendor> {
    const [kind, vendorId, email] = bearerToken.split(':');
    if (kind !== 'vendor' || !vendorId || !email) {
      return Promise.reject(new InvalidTokenError());
    }
    return Promise.resolve({ vendorId: new VendorId(vendorId), email: new Email(email) });
  }
}
