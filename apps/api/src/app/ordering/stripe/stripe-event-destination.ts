import { createHmac } from 'node:crypto';
import { Clock } from '@market-miam/common';
import { Signature } from './signature';
import { StripeSignatureHeader } from './stripe-signature-header';

const TOLERANCE_IN_SECONDS = 5 * 60;

export class StripeEventDestination {
  constructor(
    private readonly secret: string,
    private readonly clock: Clock,
  ) {}

  isGenuine(body: Buffer, signatureHeader: string | undefined): boolean {
    const header = StripeSignatureHeader.parse(signatureHeader);
    return (
      header.wasSignedWithin(TOLERANCE_IN_SECONDS, this.clock.now()) &&
      header.matches(this.signatureOf(header.signedPayloadFor(body)))
    );
  }

  private signatureOf(signedPayload: Buffer): Signature {
    return new Signature(createHmac('sha256', this.secret).update(signedPayload).digest());
  }
}
