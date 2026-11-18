import { createHmac } from 'node:crypto';

export class StripeSigning {
  constructor(
    private readonly secret: string,
    private readonly at: string,
  ) {}

  header(body: string | Buffer): string {
    return `t=${this.timestamp()},v1=${this.signatureOf(body)}`;
  }

  timestamp(): number {
    return Math.floor(new Date(this.at).getTime() / 1000);
  }

  signatureOf(body: string | Buffer): string {
    return createHmac('sha256', this.secret).update(`${this.timestamp()}.`).update(body).digest('hex');
  }
}
