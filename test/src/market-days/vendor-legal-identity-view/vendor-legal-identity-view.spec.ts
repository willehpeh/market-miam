import {
  DomainEvent,
  InMemoryCheckpoint,
  InMemoryEventStore,
  PollingSubscription,
} from '@market-miam/event-sourcing';
import { InMemoryVendorLegalIdentityViews, VendorLegalIdentityViewProjection } from '@market-miam/market-days';
import { legalIdentityProvided, vendorErased, vendorRegistered, vendorStream } from '../vendor-events';

describe('VendorLegalIdentityView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryVendorLegalIdentityViews;
  let projection: VendorLegalIdentityViewProjection;
  let subscription: PollingSubscription;

  // What vendor-id's stream already holds. The identities are seeded as the command records
  // them, SIREN and VAT number already derived from the SIRET.
  const given = (...history: DomainEvent[]): void =>
    store.seedWith(vendorStream('vendor-id'), history, { vendorId: 'vendor-id' });

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryVendorLegalIdentityViews();
    projection = new VendorLegalIdentityViewProjection(views);
    subscription = new PollingSubscription(store, projection, new InMemoryCheckpoint('vendor-legal-identity-view'));
    given(vendorRegistered('vendor-id', { registeredAt: '2026-09-01T08:00:00.000Z', email: 'marie@example.fr' }));
  });

  it('has no view for a vendor who has not provided an identity', async () => {
    await subscription.poll();

    expect(await views.findByVendor('vendor-id')).toBeUndefined();
  });

  it('holds the latest identity the vendor provided, with what the domain derived', async () => {
    given(legalIdentityProvided(), legalIdentityProvided('vendor-id', { address: '3 place du Marché, 92160 Antony' }));

    await subscription.poll();

    expect(await views.findByVendor('vendor-id')).toEqual({
      siret: '73282932000074',
      siren: '732829320',
      vatNumber: 'FR44732829320',
      legalName: 'Marie Dupont',
      address: '3 place du Marché, 92160 Antony',
      contactEmail: 'contact@chez-marie.fr',
      phone: '06 12 34 56 78',
      vatRegime: 'assujetti',
      mediatorName: null,
      mediatorUrl: null,
      legalForm: null,
      shareCapital: null,
      registryCity: null,
      legalRepresentative: null,
    });
  });

  // The identity's key outlives the erasure, so a replay still decrypts it: only this
  // event, replayed after it, keeps it out of the read model.
  it('drops the identity of an erased vendor', async () => {
    given(legalIdentityProvided(), vendorErased());

    await subscription.poll();

    expect(await views.findByVendor('vendor-id')).toBeUndefined();
  });

  it('resets by clearing the read model so a replay rebuilds it from zero', async () => {
    given(legalIdentityProvided());
    await subscription.poll();

    await projection.reset();

    expect(await views.findByVendor('vendor-id')).toBeUndefined();
  });
});
