import { sourceCodeUrl } from './source-code-url';

describe('sourceCodeUrl', () => {
  it('should pin the offer to the deployed revision', () => {
    expect(sourceCodeUrl('4f2a91c')).toBe(
      'https://github.com/willehpeh/market-miam/tree/4f2a91c',
    );
  });

  it('should fall back to the repository when the revision is unknown', () => {
    expect(sourceCodeUrl(undefined)).toBe('https://github.com/willehpeh/market-miam');
  });

  it('should fall back to the repository when the revision is empty', () => {
    expect(sourceCodeUrl('')).toBe('https://github.com/willehpeh/market-miam');
  });
});
