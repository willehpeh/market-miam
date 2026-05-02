import { ItemName } from '@market-monster/market-days';
import { EmptyValueError } from '@market-monster/common';

describe('ItemName', () => {

  it('should create an ItemName', () => {
    const name = new ItemName('Lamb Tagine');
    expect(name.value()).toBe('Lamb Tagine');
  });

  it.each([
    '',
    '   ',
  ])('should not create an empty ItemName: "%s"', (value) => {
    expect(() => new ItemName(value)).toThrow(EmptyValueError);
  });

  it('should be equal to identical ItemName', () => {
    const name1 = new ItemName('Lamb Tagine');
    const name2 = new ItemName('Lamb Tagine');
    expect(name1.equals(name2)).toBe(true);
  });

  it('should not be equal to different ItemName', () => {
    const name1 = new ItemName('Lamb Tagine');
    const name2 = new ItemName('Couscous Royal');
    expect(name1.equals(name2)).toBe(false);
  });
});
