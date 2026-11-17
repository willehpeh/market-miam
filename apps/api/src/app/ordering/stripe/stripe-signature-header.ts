import { Instant } from '@market-miam/common';
import { Signature } from './signature';

export class StripeSignatureHeader {
  readonly #timestamp: string | undefined;
  readonly #signatures: Signature[];

  private constructor(timestamp: string | undefined, signatures: Signature[]) {
    this.#timestamp = timestamp;
    this.#signatures = signatures;
  }

  static parse(header: string | undefined): StripeSignatureHeader {
    const fields = (header ?? '').split(',').map((field) => field.split('='));
    return new StripeSignatureHeader(
      fields.find(([key]) => key === 't')?.[1],
      fields.filter(([key]) => key === 'v1').map(([, hex]) => Signature.fromHex(hex ?? '')),
    );
  }

  wasSignedWithin(seconds: number, now: Instant): boolean {
    const nowInSeconds = new Date(now.value()).getTime() / 1000;
    return nowInSeconds - Number(this.#timestamp) <= seconds;
  }

  signedPayloadFor(body: Buffer): Buffer {
    return Buffer.concat([Buffer.from(`${this.#timestamp}.`), body]);
  }

  matches(expected: Signature): boolean {
    return this.#signatures.some((signature) => signature.matches(expected));
  }
}
