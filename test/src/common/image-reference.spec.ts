import { ImageReference } from '@market-miam/common';

describe('ImageReference', () => {
  it.each([
    'market-miam/items/item-photo',
    'storefronts/vendor-123/abc123def',
    'a',
  ])('should accept a non-empty reference: "%s"', (value) => {
    expect(new ImageReference(value).value()).toBe(value);
  });

  it('should trim surrounding whitespace', () => {
    expect(new ImageReference('  market-miam/items/photo  ').value()).toBe('market-miam/items/photo');
  });

  it.each([
    '',
    '   ',
  ])('should reject an empty value: "%s"', (value) => {
    expect(() => new ImageReference(value)).toThrow();
  });
});
