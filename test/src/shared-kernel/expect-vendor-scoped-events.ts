import { expect } from 'vitest';
import { StoredEvent } from '@market-miam/event-sourcing';

export function expectVendorScopedEvents(events: StoredEvent[], vendorId: string): void {
  expect(events).not.toHaveLength(0);
  events.forEach(event =>
    expect(event.metadata).toEqual(expect.objectContaining({ vendorId })),
  );
}
