import { VendorErased, VendorLegalIdentityProvided, VendorRegistered } from '@market-miam/market-days';

// The events a vendor spec seeds as its Given, typed against the domain's event types
// (see market-day-events.ts for the stance). Defaults match TestRegisterVendor.valid() and
// TestProvideVendorLegalIdentity.valid(). Seed them on `vendorStream(vendorId)`.
export const vendorStream = (vendorId = 'vendor-id'): string => `vendor-${vendorId}`;

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
