// A list the vendor puts in order one step at a time. A step off either end changes nothing.
export class Arrangement<Item> {
  constructor(private readonly items: readonly Item[]) {}

  movedUp(index: number): Item[] {
    return this.swapped(index, index - 1);
  }

  movedDown(index: number): Item[] {
    return this.swapped(index, index + 1);
  }

  private swapped(index: number, neighbour: number): Item[] {
    const items = [...this.items];
    if (neighbour < 0 || neighbour >= items.length) {
      return items;
    }
    [items[index], items[neighbour]] = [items[neighbour], items[index]];
    return items;
  }
}
