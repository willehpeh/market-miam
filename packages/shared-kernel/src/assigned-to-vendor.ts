import { DomainEvent, EventEnvelope } from '@market-monster/event-sourcing';
import { VendorId } from './vendor-id';

export function assignedToVendor(events: DomainEvent[], vendorId: VendorId): EventEnvelope[] {
    return events.map(event => ({ event, metadata: { vendorId: vendorId.value() } }))
}
