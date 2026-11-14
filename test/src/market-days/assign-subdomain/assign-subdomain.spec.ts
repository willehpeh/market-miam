import { DomainEvent, InMemoryEventStore, UnitOfWork } from '@market-miam/event-sourcing';
import {
  AssignSubdomain,
  AssignSubdomainHandler,
  InMemorySubdomainRegistry,
  InvalidSubdomainError,
  ReservedSubdomainError,
  SubdomainAlreadyAssignedError,
  SubdomainTakenError,
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

  // A DNS label a storefront can live at (ADR 0065).
  it.each([
    { subdomain: '', why: 'empty' },
    { subdomain: 'ab', why: 'too short' },
    { subdomain: 'a'.repeat(64), why: 'too long' },
    { subdomain: '-marie', why: 'starting with a hyphen' },
    { subdomain: 'marie-', why: 'ending with a hyphen' },
    { subdomain: 'xn--crpes', why: 'holding a double hyphen' },
    { subdomain: 'chez_marie', why: 'holding an underscore' },
    { subdomain: 'chez.marie', why: 'holding a dot' },
    { subdomain: 'chez marie', why: 'holding a space' },
    { subdomain: 'crêpes', why: 'holding an accent' },
  ])('refuses a subdomain $why, claiming and recording nothing', async ({ subdomain }) => {
    given(vendorInvited());

    await expect(handler.execute(new AssignSubdomain('vendor-id', subdomain, ASSIGNED_AT))).rejects.toThrow(
      InvalidSubdomainError,
    );
    expect(await registry.assignments()).toEqual([]);
    expect(store.newEvents()).toEqual([]);
  });

  // Hosts Market Miam serves, or may serve: a vendor there would never be reached (ADR 0065).
  it.each(['admin', 'api', 'app', 'www', 'mail', 'staging', 'status'])(
    'refuses the reserved subdomain %s, claiming and recording nothing',
    async (subdomain) => {
      given(vendorInvited());

      await expect(handler.execute(new AssignSubdomain('vendor-id', subdomain, ASSIGNED_AT))).rejects.toThrow(
        ReservedSubdomainError,
      );
      expect(await registry.assignments()).toEqual([]);
      expect(store.newEvents()).toEqual([]);
    },
  );

  // One vendor per name, across every vendor: the registry's word, not any stream's (ADR 0065).
  it('refuses a subdomain another vendor holds, claiming and recording nothing', async () => {
    given(vendorInvited());
    await registry.register('chez-marie', 'another-vendor');

    await expect(handler.execute(new AssignSubdomain('vendor-id', 'chez-marie', ASSIGNED_AT))).rejects.toThrow(
      SubdomainTakenError,
    );
    expect(await registry.vendorFor('chez-marie')).toBe('another-vendor');
    expect(store.newEvents()).toEqual([]);
  });

  // Once only: the vendor's printed QR codes carry the address (ADR 0055, 0065).
  it('refuses a vendor who already holds another subdomain, claiming and recording nothing', async () => {
    given(vendorInvited());
    await registry.register('marie-traiteur', 'vendor-id');

    await expect(handler.execute(new AssignSubdomain('vendor-id', 'chez-marie', ASSIGNED_AT))).rejects.toThrow(
      SubdomainAlreadyAssignedError,
    );
    expect(await registry.assignments()).toEqual([{ subdomain: 'marie-traiteur', vendorId: 'vendor-id' }]);
    expect(store.newEvents()).toEqual([]);
  });
});
