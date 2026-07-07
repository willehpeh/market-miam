import { StoredEvent } from '@market-miam/event-sourcing';

export function vendorIdFrom(event: StoredEvent): string {
  const vendorId = event.metadata?.['vendorId'];
  return vendorId as string;
}
