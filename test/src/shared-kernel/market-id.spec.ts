import { MarketId } from '@market-miam/shared-kernel';
import { EmptyValueError } from '@market-miam/common';

describe('MarketId', () => {
  it('should accept a valid market ID', () => {
    const marketId = new MarketId('market-123');
    expect(marketId.value()).toBe('market-123');
  });

  it.each([
    '',
    '   ',
  ])('should reject an empty market ID: "%s"', (value) => {
    expect(() => new MarketId(value)).toThrow(EmptyValueError);
  });

  it('should trim whitespace', () => {
    const marketId = new MarketId('  market-123  ');
    expect(marketId.value()).toBe('market-123');
  });
});
