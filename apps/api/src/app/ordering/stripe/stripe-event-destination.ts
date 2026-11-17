import { createHmac } from 'node:crypto';
import { Clock } from '@market-miam/common';
import { Signature } from './signature';

export class StripeEventDestination {
  constructor(
    private readonly secret: string,
    private readonly clock: Clock,
  ) {}

  isGenuine(body: Buffer, header: string): boolean {
    const fields = new Map(header.split(',').map((field) => field.split('=') as [string, string]));
    const timestamp = fields.get('t');
    const ageInSeconds = new Date(this.clock.now().value()).getTime() / 1000 - Number(timestamp);
    return ageInSeconds <= 300 && Signature.fromHex(fields.get('v1') ?? '').matches(this.signatureOf(body, timestamp));
  }

  private signatureOf(body: Buffer, timestamp: string | undefined): Signature {
    return new Signature(createHmac('sha256', this.secret).update(`${timestamp}.`).update(body).digest());
  }
}
