import { StoredEvent } from '@market-monster/event-sourcing';

export function vendorIdFrom(event: StoredEvent): string {
  const vendorId = event.metadata?.['vendorId'];
  return vendorId as string;
}
