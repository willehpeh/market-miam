import { ItemId } from '@market-monster/market-days';

describe('ItemId', () => {

  it('should create an ItemId', () => {
    expect(new ItemId('test')).toBeDefined();
  });

  it('should not allow empty values', () => {
    expect(() => new ItemId('')).toThrow();
  });

  it('should be equal to identical ItemId', () => {
    const id1 = new ItemId('test');
    const id2 = new ItemId('test');
    expect(id1.equals(id2)).toBe(true);
  });

  it('should not be equal to different ItemId', () => {
    const id1 = new ItemId('test');
    const id2 = new ItemId('different');
    expect(id1.equals(id2)).toBe(false);
  });
});
