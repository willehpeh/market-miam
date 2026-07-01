import { Aggregate } from '@market-monster/event-sourcing';
import { VendorId } from '@market-monster/shared-kernel';
import { VendorScopedEvents } from './vendor-scoped-events';

export abstract class VendorScopedRepository<A extends Aggregate> {
  constructor(
    private readonly vendorEvents: VendorScopedEvents,
    private readonly prefix: string,
    private readonly create: (vendorId: VendorId) => A,
  ) {}

  async forVendor(vendorId: VendorId): Promise<A> {
    return this.create(vendorId).rehydrate(await this.vendorEvents.load(this.streamIdFor(vendorId)));
  }

  async save(aggregate: A, vendorId: VendorId): Promise<void> {
    await this.vendorEvents.save(this.streamIdFor(vendorId), aggregate, vendorId);
  }

  private streamIdFor(vendorId: VendorId): string {
    return `${this.prefix}-${vendorId.value()}`;
  }
}
