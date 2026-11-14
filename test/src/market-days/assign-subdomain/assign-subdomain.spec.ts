import { DomainEvent, InMemoryEventStore, UnitOfWork } from '@market-miam/event-sourcing';
import {
  AssignSubdomain,
  AssignSubdomainHandler,
  InMemorySubdomainRegistry,
  InvalidSubdomainError,
  ReservedSubdomainError,
  SubdomainAlreadyAssignedError,
  SubdomainTakenError,
  VendorErasedError,
  VendorNotInvitedError,
  VendorScopedEvents,
  Vendors,
} from '@market-miam/market-days';
import { vendorErased, vendorInvited, vendorRegistered, vendorStream, vendorSubdomainAssigned } from '../vendor-events';

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
    { subdomain: 'xn--crpes', why: 'with a double hyphen' },
    { subdomain: 'chez_marie', why: 'with an underscore' },
    { subdomain: 'chez.marie', why: 'with a dot' },
    { subdomain: 'chez marie', why: 'with a space' },
    { subdomain: 'crêpes', why: 'with an accent' },
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
  it('refuses a subdomain assigned to another vendor, claiming and recording nothing', async () => {
    given(vendorInvited());
    await registry.register('chez-marie', 'another-vendor');

    await expect(handler.execute(new AssignSubdomain('vendor-id', 'chez-marie', ASSIGNED_AT))).rejects.toThrow(
      SubdomainTakenError,
    );
    expect(await registry.vendorFor('chez-marie')).toBe('another-vendor');
    expect(store.newEvents()).toEqual([]);
  });

  // Once only: the vendor's printed QR codes carry the address (ADR 0055, 0065).
  it('refuses a vendor who has a subdomain already, claiming and recording nothing', async () => {
    given(vendorInvited());
    await registry.register('marie-traiteur', 'vendor-id');

    await expect(handler.execute(new AssignSubdomain('vendor-id', 'chez-marie', ASSIGNED_AT))).rejects.toThrow(
      SubdomainAlreadyAssignedError,
    );
    expect(await registry.assignments()).toEqual([{ subdomain: 'marie-traiteur', vendorId: 'vendor-id' }]);
    expect(store.newEvents()).toEqual([]);
  });

  // Assigned by hand before the event existed: assigning it again records it (ADR 0065).
  it('records a subdomain assigned to the vendor already, and claims nothing more', async () => {
    given(vendorInvited());
    await registry.register('chez-marie', 'vendor-id');

    await handler.execute(new AssignSubdomain('vendor-id', 'chez-marie', ASSIGNED_AT));

    expect(await registry.assignments()).toEqual([{ subdomain: 'chez-marie', vendorId: 'vendor-id' }]);
    expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'VendorSubdomainAssigned' })]);
  });

  it('records an assignment once', async () => {
    given(vendorInvited(), vendorSubdomainAssigned());
    await registry.register('chez-marie', 'vendor-id');

    await handler.execute(new AssignSubdomain('vendor-id', 'chez-marie', '2026-11-14T10:00:00.000Z'));

    expect(store.newEvents()).toEqual([]);
  });

  it('assigns a registered vendor their subdomain', async () => {
    given(vendorInvited(), vendorRegistered());

    await handler.execute(new AssignSubdomain('vendor-id', 'chez-marie', ASSIGNED_AT));

    expect(await registry.vendorFor('chez-marie')).toBe('vendor-id');
    expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'VendorSubdomainAssigned' })]);
  });

  // A subdomain is for a vendor someone invited, who has not been erased (ADR 0065).
  it.each([
    { who: 'a vendor with no history', history: [], refusal: VendorNotInvitedError },
    { who: 'an erased vendor', history: [vendorInvited(), vendorErased()], refusal: VendorErasedError },
  ])('refuses $who, claiming and recording nothing', async ({ history, refusal }) => {
    given(...history);

    await expect(handler.execute(new AssignSubdomain('vendor-id', 'chez-marie', ASSIGNED_AT))).rejects.toThrow(refusal);
    expect(await registry.assignments()).toEqual([]);
    expect(store.newEvents()).toEqual([]);
  });

  // Browsers lower-case host names, and the registry compares in lower case (ADR 0065).
  it('lower-cases a subdomain typed in capitals', async () => {
    given(vendorInvited());

    await handler.execute(new AssignSubdomain('vendor-id', 'Chez-Marie', ASSIGNED_AT));

    expect(await registry.assignments()).toEqual([{ subdomain: 'chez-marie', vendorId: 'vendor-id' }]);
    expect(store.newEvents()).toEqual([
      expect.objectContaining({ payload: expect.objectContaining({ subdomain: 'chez-marie' }) }),
    ]);
  });
});
