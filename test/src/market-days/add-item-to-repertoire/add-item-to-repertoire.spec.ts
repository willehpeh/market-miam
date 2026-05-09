import { AddItemToRepertoireHandler, InvalidPriceError, ItemAddedToRepertoire } from '@market-monster/market-days';
import { EmptyValueError, InvalidUrlError } from '@market-monster/common';
import { InMemoryEventStore } from '../../in-memory.event-store';
import { TestAddItemToRepertoire } from './test-data';
import { describe, it, beforeEach } from 'vitest';

describe('AddItemToRepertoire', () => {
  let eventStore: InMemoryEventStore;
  let handler: AddItemToRepertoireHandler;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    handler = new AddItemToRepertoireHandler(eventStore);
  });

  it('should add the item to the repertoire', async () => {
    const request = TestAddItemToRepertoire.valid();

    await handler.handle(request);

    const expectedEvent: ItemAddedToRepertoire = {
      type: 'ItemAddedToRepertoire',
      payload: {
        itemId: request.itemId,
        name: request.name,
        description: request.description,
        price: request.price,
        photoUrl: request.photoUrl,
      },
    };
    expect(eventStore.allEvents()).toEqual([expect.objectContaining(expectedEvent)]);
  });

  it('should allow free items', async () => {
    await handler.handle(TestAddItemToRepertoire.with({ price: 0 }));

    expect(eventStore.allEvents()).toHaveLength(1);
    expect(eventStore.allEvents()[0].payload['price']).toBe(0);
  });

  it('should allow an empty description', async () => {
    await handler.handle(TestAddItemToRepertoire.with({ description: '' }));

    expect(eventStore.allEvents()).toHaveLength(1);
    expect(eventStore.allEvents()[0].payload['description']).toBe('');
  });

  describe('rejects invalid input', () => {
    it.each([
      '',
      '   ',
    ])('should reject an empty item ID: "%s"', async (itemId) => {
      await expect(handler.handle(TestAddItemToRepertoire.with({ itemId }))).rejects.toThrow(EmptyValueError);
    });

    it.each([
      '',
      '   ',
    ])('should reject an empty item name: "%s"', async (name) => {
      await expect(handler.handle(TestAddItemToRepertoire.with({ name }))).rejects.toThrow(EmptyValueError);
    });

    it('should reject a negative price', async () => {
      await expect(handler.handle(TestAddItemToRepertoire.with({ price: -100 }))).rejects.toThrow(InvalidPriceError);
    });

    it.each([
      '',
      'not-a-url',
      'ftp://example.com/file.txt',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'mailto:someone@example.com',
      '   ',
    ])('should reject an invalid photo URL: %s', async (photoUrl) => {
      await expect(handler.handle(TestAddItemToRepertoire.with({ photoUrl }))).rejects.toThrow(InvalidUrlError);
    });
  });
});
