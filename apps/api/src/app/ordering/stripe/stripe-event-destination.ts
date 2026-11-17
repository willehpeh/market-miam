import { createHmac } from 'node:crypto';
import { Clock } from '@market-miam/common';
import { Signature } from './signature';

const TOLERANCE_IN_SECONDS = 5 * 60;

export class StripeEventDestination {
  constructor(
    private readonly secret: string,
    private readonly clock: Clock,
  ) {}

  isGenuine(body: Buffer, header: string | undefined): boolean {
    const fields = (header ?? '').split(',').map((field) => field.split('='));
    const timestamp = fields.find(([key]) => key === 't')?.[1];
    const provided = fields.filter(([key]) => key === 'v1').map(([, hex]) => Signature.fromHex(hex ?? ''));
    return this.isRecent(timestamp) && this.anyMatches(provided, this.signatureOf(body, timestamp));
  }

  private isRecent(timestamp: string | undefined): boolean {
    const nowInSeconds = new Date(this.clock.now().value()).getTime() / 1000;
    return nowInSeconds - Number(timestamp) <= TOLERANCE_IN_SECONDS;
  }

  private signatureOf(body: Buffer, timestamp: string | undefined): Signature {
    return new Signature(createHmac('sha256', this.secret).update(`${timestamp}.`).update(body).digest());
  }

  private anyMatches(provided: Signature[], expected: Signature): boolean {
    return provided.some((signature) => signature.matches(expected));
  }
}
