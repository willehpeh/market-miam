import { VendorAccountClosed, VendorErased, VendorInvited, VendorLegalIdentityProvided, VendorRegistered } from '@market-miam/market-days';

// The events a vendor spec seeds as its Given, typed against the domain's event types
// (see market-day-events.ts for the stance). Defaults match TestInviteVendor.valid(),
// TestRegisterVendor.valid() and TestProvideVendorLegalIdentity.valid(). Seed them on
// `vendorStream(vendorId)`.
export const vendorStream = (vendorId = 'vendor-id'): string => `vendor-${vendorId}`;

export const vendorInvited = (vendorId = 'vendor-id', overrides: Partial<VendorInvited['payload']> = {}): VendorInvited =>
  ({ type: 'VendorInvited', payload: { vendorId, invitedAt: '2026-11-11T09:00:00.000Z', email: 'marie@example.fr', ...overrides }, version: 1 });

export const vendorRegistered = (vendorId = 'vendor-id', overrides: Partial<VendorRegistered['payload']> = {}): VendorRegistered =>
  ({ type: 'VendorRegistered', payload: { vendorId, registeredAt: '2026-06-13T20:33:19.632Z', email: 'vendor@domain.com', ...overrides }, version: 1 });

export const legalIdentityProvided = (vendorId = 'vendor-id', overrides: Partial<VendorLegalIdentityProvided['payload']> = {}): VendorLegalIdentityProvided => ({
  type: 'VendorLegalIdentityProvided',
  payload: {
    vendorId,
    siret: '73282932000074',
    siren: '732829320',
    vatNumber: 'FR44732829320',
    legalName: 'Marie Dupont',
    address: '12 rue des Halles, 92330 Sceaux',
    contactEmail: 'contact@chez-marie.fr',
    phone: '06 12 34 56 78',
    vatRegime: 'assujetti',
    mediatorName: null,
    mediatorUrl: null,
    legalForm: null,
    shareCapital: null,
    registryCity: null,
    legalRepresentative: null,
    ...overrides,
  },
  version: 1,
});

export const vendorErased = (vendorId = 'vendor-id', erasedAt = '2026-10-04T09:00:00.000Z'): VendorErased =>
  ({ type: 'VendorErased', payload: { vendorId, erasedAt }, version: 1 });

export const vendorAccountClosed = (vendorId = 'vendor-id', closedAt = '2026-11-14T09:00:05.000Z'): VendorAccountClosed =>
  ({ type: 'VendorAccountClosed', payload: { vendorId, closedAt }, version: 1 });
