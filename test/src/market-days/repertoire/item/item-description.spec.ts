import { ItemDescription } from '@market-monster/market-days';

describe('ItemDescription', () => {

  it('should create an ItemDescription', () => {
    const description = new ItemDescription('Slow-cooked Moroccan lamb with prunes and almonds');
    expect(description.value()).toBe('Slow-cooked Moroccan lamb with prunes and almonds');
  });

  it('should be equal to identical ItemDescription', () => {
    const desc1 = new ItemDescription('Slow-cooked lamb');
    const desc2 = new ItemDescription('Slow-cooked lamb');
    expect(desc1.equals(desc2)).toBe(true);
  });

  it('should not be equal to different ItemDescription', () => {
    const desc1 = new ItemDescription('Slow-cooked lamb');
    const desc2 = new ItemDescription('Grilled sausage');
    expect(desc1.equals(desc2)).toBe(false);
  });
});
