import type { VerifiedVendor } from './verified-vendor';

export abstract class TokenVerifier {
  abstract verify(bearerToken: string): Promise<VerifiedVendor>;
}
