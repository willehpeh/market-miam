import { ItemPrice } from '@market-monster/market-days';

describe('ItemPrice', () => {

  it('should create an ItemPrice', () => {
    const price = new ItemPrice(1200);
    expect(price.value()).toBe(1200);
  });

  it('should be equal to identical ItemPrice', () => {
    const price1 = new ItemPrice(1200);
    const price2 = new ItemPrice(1200);
    expect(price1.equals(price2)).toBe(true);
  });

  it('should not be equal to different ItemPrice', () => {
    const price1 = new ItemPrice(1200);
    const price2 = new ItemPrice(1500);
    expect(price1.equals(price2)).toBe(false);
  });
});
