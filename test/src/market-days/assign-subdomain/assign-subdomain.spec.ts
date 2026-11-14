import { DomainEvent, InMemoryEventStore, UnitOfWork } from '@market-miam/event-sourcing';
import {
  AssignSubdomain,
  AssignSubdomainHandler,
  InMemorySubdomainRegistry,
  VendorScopedEvents,
  Vendors,
} from '@market-miam/market-days';
import { vendorInvited, vendorStream } from '../vendor-events';

const ASSIGNED_AT = '2026-11-14T09:00:00.000Z';

describe('Assign Subdomain', () => {
  let store: InMemoryEventStore;
  let registry: InMemorySubdomainRegistry;
  let handler: AssignSubdomainHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    registry = new InMemorySubdomainRegistry();
    handler = new AssignSubdomainHandler(new Vendors(new VendorScopedEvents(store)), registry, UnitOfWork.none());
  });

  const given = (...history: DomainEvent[]): void =>
    store.seedWith(vendorStream('vendor-id'), history, { vendorId: 'vendor-id' });

  // Claimed in the registry and recorded on the vendor's stream, together (ADR 0065).
  it('assigns an invited vendor their subdomain', async () => {
    given(vendorInvited());

    await handler.execute(new AssignSubdomain('vendor-id', 'chez-marie', ASSIGNED_AT));

    expect(await registry.vendorFor('chez-marie')).toBe('vendor-id');
    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'VendorSubdomainAssigned',
        payload: { vendorId: 'vendor-id', subdomain: 'chez-marie', assignedAt: ASSIGNED_AT },
      }),
    ]);
  });
});
