import { Clock } from '@market-miam/common';
import { SigningSecret } from './signing-secret';
import { StripeSignatureHeader } from './stripe-signature-header';

const TOLERANCE_IN_SECONDS = 5 * 60;

export class StripeEventDestination {
  constructor(
    private readonly secret: SigningSecret,
    private readonly clock: Clock,
  ) {}

  isGenuine(body: Buffer, signatureHeader: string | undefined): boolean {
    const header = StripeSignatureHeader.parse(signatureHeader);
    return (
      header.wasSignedWithin(TOLERANCE_IN_SECONDS, this.clock.now()) &&
      header.matches(this.secret.sign(header.signedPayloadFor(body)))
    );
  }
}
