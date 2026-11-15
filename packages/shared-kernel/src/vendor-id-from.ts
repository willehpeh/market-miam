import { StoredEvent } from '@market-miam/event-sourcing';
import { VENDOR_ID_METADATA_KEY } from './vendor-metadata';

// Every writer stamps vendorId (VendorScopedEvents.save); an event reaching a projection
// without it is a wiring bug, surfaced here as a diagnosis rather than downstream as an
// "undefined" map key or a NOT NULL violation.
export function vendorIdFrom(event: StoredEvent): string {
  const vendorId = event.metadata?.[VENDOR_ID_METADATA_KEY];
  if (typeof vendorId !== 'string') {
    throw new Error(`${event.type} event carries no ${VENDOR_ID_METADATA_KEY} metadata`);
  }
  return vendorId;
}
