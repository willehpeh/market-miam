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
    const fields = new Map((header ?? '').split(',').map((field) => field.split('=') as [string, string]));
    const timestamp = fields.get('t');
    const provided = Signature.fromHex(fields.get('v1') ?? '');
    return this.isRecent(timestamp) && provided.matches(this.signatureOf(body, timestamp));
  }

  private isRecent(timestamp: string | undefined): boolean {
    const nowInSeconds = new Date(this.clock.now().value()).getTime() / 1000;
    return nowInSeconds - Number(timestamp) <= TOLERANCE_IN_SECONDS;
  }

  private signatureOf(body: Buffer, timestamp: string | undefined): Signature {
    return new Signature(createHmac('sha256', this.secret).update(`${timestamp}.`).update(body).digest());
  }
}
