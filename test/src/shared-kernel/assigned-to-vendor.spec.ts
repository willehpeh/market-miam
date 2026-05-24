import { assignedToVendor, VendorId } from '@market-monster/shared-kernel';
import { DomainEvent } from '@market-monster/event-sourcing';

describe('Assigned to vendor', () => {
  it('should associate raised events with the vendor who caused them', () => {
    const vendorId = new VendorId('vendor-123');
    const events: DomainEvent[] = [
      { type: 'MarketScheduleRegistered', payload: { marketId: 'market-1' } },
      { type: 'ItemAddedToRepertoire', payload: { itemName: 'Sourdough' } },
    ];

    const envelopes = assignedToVendor(events, vendorId);

    expect(envelopes).toEqual([
      { event: events[0], metadata: { vendorId } },
      { event: events[1], metadata: { vendorId } },
    ]);
  });
});