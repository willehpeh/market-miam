import { describe, expect, it } from 'vitest';
import { Signature } from './signature';

const HEX = '5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd';
const OTHER_HEX = '0000a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd';

describe('A signature', () => {
  it('matches a signature of the same bytes', () => {
    expect(Signature.fromHex(HEX).matches(Signature.fromHex(HEX))).toBe(true);
  });

  it('does not match a signature of other bytes', () => {
    expect(Signature.fromHex(HEX).matches(Signature.fromHex(OTHER_HEX))).toBe(false);
  });

  it('does not match a signature of another length, rather than failing', () => {
    expect(Signature.fromHex(HEX).matches(Signature.fromHex(HEX.slice(0, 8)))).toBe(false);
  });

  it('offers nothing but whether it matches another', () => {
    expect(Object.getOwnPropertyNames(Signature.prototype)).toEqual(['constructor', 'matches']);
  });

  it('gives nothing away when serialized', () => {
    expect(JSON.stringify(Signature.fromHex(HEX))).toBe('{}');
  });
});
