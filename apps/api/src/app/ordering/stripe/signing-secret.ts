import { createHmac } from 'node:crypto';
import { Signature } from './signature';

export class SigningSecret {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  sign(signedPayload: Buffer): Signature {
    return new Signature(createHmac('sha256', this.#value).update(signedPayload).digest());
  }
}
