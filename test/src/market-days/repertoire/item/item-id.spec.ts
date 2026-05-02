import { ItemId } from '@market-monster/market-days';
import { EmptyValueError } from '@market-monster/common';

describe('ItemId', () => {

  it('should create an ItemId', () => {
    expect(new ItemId('test')).toBeDefined();
  });

  it.each([
    '',
    '   ',
  ])('should not create an empty ItemId: "%s"', (value) => {
    expect(() => new ItemId(value)).toThrow(EmptyValueError);
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
