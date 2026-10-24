import { CheckpointedProjection, EventHandlerMap, ProjectionFor, StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';
import { VendorErased, VendorLegalIdentityProvided } from '../vendor/events';
import { VendorLegalIdentityViewStore } from './vendor-legal-identity-view.store';

// The identity's key outlives the vendor's erasure by five years (ADR 0056), so a replay
// still decrypts it. VendorErased, replayed after it, is what keeps it out of this table.
@CheckpointedProjection('vendor-legal-identity-view')
export class VendorLegalIdentityViewProjection extends ProjectionFor<VendorLegalIdentityProvided | VendorErased> {

  constructor(private readonly store: VendorLegalIdentityViewStore) {
    super();
  }

  protected handlers(): EventHandlerMap<VendorLegalIdentityProvided | VendorErased> {
    return {
      VendorLegalIdentityProvided: e => this.handleProvided(e),
      VendorErased: e => this.store.remove(vendorIdFrom(e)),
    };
  }

  reset(): Promise<void> {
    return this.store.clear();
  }

  private handleProvided(event: StoredEvent<VendorLegalIdentityProvided>): Promise<void> {
    const { vendorId: _vendorId, ...identity } = event.payload;
    return this.store.provide(vendorIdFrom(event), identity);
  }
}
