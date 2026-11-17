import { timingSafeEqual } from 'node:crypto';

export class Signature {
  readonly #bytes: Buffer;

  constructor(bytes: Buffer) {
    this.#bytes = bytes;
  }

  static fromHex(hex: string): Signature {
    return new Signature(Buffer.from(hex, 'hex'));
  }

  matches(other: Signature): boolean {
    return this.#bytes.length === other.#bytes.length && timingSafeEqual(this.#bytes, other.#bytes);
  }
}
