import { createHmac } from 'node:crypto';
import { Clock } from '@market-miam/common';

export class StripeEventDestination {
  constructor(
    private readonly secret: string,
    private readonly clock: Clock,
  ) {}

  isGenuine(body: Buffer, header: string): boolean {
    const fields = new Map(header.split(',').map((field) => field.split('=') as [string, string]));
    const expected = createHmac('sha256', this.secret).update(`${fields.get('t')}.`).update(body).digest('hex');
    return fields.get('v1') === expected;
  }
}
