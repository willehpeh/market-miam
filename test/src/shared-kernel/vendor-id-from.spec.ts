import { StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';

function event(metadata?: Record<string, unknown>): StoredEvent {
  return {
    type: 'ItemAddedToCatalogue',
    payload: {},
    version: 1,
    id: 'event-1',
    globalPosition: 1,
    streamId: 'catalogue-vendor-1',
    streamPosition: 1,
    timestamp: 0,
    metadata,
  };
}

describe('vendorIdFrom', () => {
  it('reads the vendor a writer stamped onto the event', () => {
    expect(vendorIdFrom(event({ vendorId: 'vendor-1' }))).toBe('vendor-1');
  });

  it.each([
    ['no metadata at all', undefined],
    ['metadata carrying no vendor', { correlationId: 'correlation-1' }],
    ['a vendorId that is not a string', { vendorId: 42 }],
  ])('refuses an event with %s, naming the type that arrived unstamped', (_, metadata) => {
    expect(() => vendorIdFrom(event(metadata)))
      .toThrow('ItemAddedToCatalogue event carries no vendorId metadata');
  });
});
