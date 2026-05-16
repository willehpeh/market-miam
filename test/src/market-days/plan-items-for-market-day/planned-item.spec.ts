import { PlannedItem } from '@market-monster/market-days';

describe('PlannedItem', () => {
  it('should accept a valid item with no quantity', () => {
    const item = new PlannedItem('item-1');
    expect(item.itemId()).toBe('item-1');
    expect(item.quantity()).toBeUndefined();
  });

  it('should accept a valid item with a quantity', () => {
    const item = new PlannedItem('item-1', 10);
    expect(item.itemId()).toBe('item-1');
    expect(item.quantity()).toBe(10);
  });

  it.each([
    '',
    '   ',
  ])('should reject an empty item ID: "%s"', (itemId) => {
    expect(() => new PlannedItem(itemId)).toThrow();
  });

  it.each([
    0,
    -1,
    -100,
  ])('should reject a non-positive quantity: %d', (quantity) => {
    expect(() => new PlannedItem('item-1', quantity)).toThrow();
  });
});
