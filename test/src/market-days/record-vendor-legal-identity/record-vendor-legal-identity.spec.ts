import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { IncompleteCompanyDetailsError, IncompleteMediatorError, InvalidSiretError, InvalidVatRegimeError, RecordVendorLegalIdentityHandler, VendorNotRegisteredError, VendorScopedEvents, Vendors } from '@market-miam/market-days';
import { EmptyValueError, InvalidEmailError, InvalidUrlError } from '@market-miam/common';
import { TestRecordVendorLegalIdentity } from './test-data';

describe('Record Vendor Legal Identity', () => {
  let store: InMemoryEventStore;
  let handler: RecordVendorLegalIdentityHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new RecordVendorLegalIdentityHandler(new Vendors(new VendorScopedEvents(store)));
  });

  it('records the legal identity of a registered vendor, deriving the SIREN and TVA number', async () => {
    registerVendor();
    const command = TestRecordVendorLegalIdentity.valid();

    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'VendorLegalIdentityRecorded',
        payload: {
          vendorId: 'vendor-id',
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
        },
      }),
    ]);
  });

  it('records no TVA number for a vendor under the franchise en base', async () => {
    registerVendor();

    await handler.execute(TestRecordVendorLegalIdentity.with({ vatRegime: 'franchise' }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'VendorLegalIdentityRecorded',
        payload: expect.objectContaining({ vatRegime: 'franchise', vatNumber: null }),
      }),
    ]);
  });

  it.each([
    { scenario: 'a SIRET that is too short', overrides: { siret: '7328293200007' }, error: InvalidSiretError },
    { scenario: 'a SIRET that holds a letter', overrides: { siret: '7328293200007A' }, error: InvalidSiretError },
    { scenario: 'a SIRET that fails its check digit', overrides: { siret: '73282932000075' }, error: InvalidSiretError },
    { scenario: 'a blank dénomination', overrides: { legalName: '  ' }, error: EmptyValueError },
    { scenario: 'a blank address', overrides: { address: '' }, error: EmptyValueError },
    { scenario: 'a blank phone', overrides: { phone: ' ' }, error: EmptyValueError },
    { scenario: 'a malformed contact email', overrides: { contactEmail: 'contact@' }, error: InvalidEmailError },
    { scenario: 'a TVA regime that is neither assujetti nor franchise', overrides: { vatRegime: 'exonéré' }, error: InvalidVatRegimeError },
    { scenario: 'a médiateur named without a site', overrides: { mediatorName: 'CM2C' }, error: IncompleteMediatorError },
    { scenario: 'a médiateur site without a name', overrides: { mediatorUrl: 'https://www.cm2c.net' }, error: IncompleteMediatorError },
    { scenario: 'a médiateur site that is not a URL', overrides: { mediatorName: 'CM2C', mediatorUrl: 'cm2c' }, error: InvalidUrlError },
    { scenario: 'société details with only a legal form', overrides: { legalForm: 'SARL' }, error: IncompleteCompanyDetailsError },
    {
      scenario: 'société details missing the representative',
      overrides: { legalForm: 'SARL', shareCapital: '5000', registryCity: 'Nanterre' },
      error: IncompleteCompanyDetailsError,
    },
    {
      scenario: 'société details with a blank capital',
      overrides: { legalForm: 'SARL', shareCapital: '  ', registryCity: 'Nanterre', legalRepresentative: 'Marie Dupont' },
      error: IncompleteCompanyDetailsError,
    },
  ])('rejects $scenario, recording nothing', async ({ overrides, error }) => {
    registerVendor();

    await expect(handler.execute(TestRecordVendorLegalIdentity.with(overrides))).rejects.toThrow(error);
    expect(store.newEvents()).toEqual([]);
  });

  it('accepts a SIRET typed with spaces, recording it without them', async () => {
    registerVendor();

    await handler.execute(TestRecordVendorLegalIdentity.with({ siret: '732 829 320 00074' }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ payload: expect.objectContaining({ siret: '73282932000074', siren: '732829320' }) }),
    ]);
  });

  it('raises nothing when the legal identity is unchanged', async () => {
    registerVendor();
    await handler.execute(TestRecordVendorLegalIdentity.valid());

    await handler.execute(TestRecordVendorLegalIdentity.valid());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'VendorLegalIdentityRecorded' }),
    ]);
  });

  it('records the whole identity again when any of it changes', async () => {
    registerVendor();
    await handler.execute(TestRecordVendorLegalIdentity.valid());

    await handler.execute(TestRecordVendorLegalIdentity.with({ address: '3 place du Marché, 92160 Antony' }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'VendorLegalIdentityRecorded' }),
      expect.objectContaining({
        type: 'VendorLegalIdentityRecorded',
        payload: expect.objectContaining({ siret: '73282932000074', address: '3 place du Marché, 92160 Antony' }),
      }),
    ]);
  });

  it('records the details a société owes: legal form, capital, greffe and representative', async () => {
    registerVendor();
    const command = TestRecordVendorLegalIdentity.with({
      legalName: 'Chez Marie SARL',
      legalForm: 'SARL',
      shareCapital: '5000',
      registryCity: 'Nanterre',
      legalRepresentative: 'Marie Dupont',
    });

    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({
          legalForm: 'SARL',
          shareCapital: '5000',
          registryCity: 'Nanterre',
          legalRepresentative: 'Marie Dupont',
        }),
      }),
    ]);
  });

  it('records the médiateur de la consommation the vendor subscribes to', async () => {
    registerVendor();

    await handler.execute(TestRecordVendorLegalIdentity.with({ mediatorName: 'CM2C', mediatorUrl: 'https://www.cm2c.net' }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({ mediatorName: 'CM2C', mediatorUrl: 'https://www.cm2c.net' }),
      }),
    ]);
  });

  it('trims the dénomination, address and phone', async () => {
    registerVendor();

    await handler.execute(TestRecordVendorLegalIdentity.with({
      legalName: '  Marie Dupont ',
      address: ' 12 rue des Halles, 92330 Sceaux  ',
      phone: ' 06 12 34 56 78 ',
    }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({
          legalName: 'Marie Dupont',
          address: '12 rue des Halles, 92330 Sceaux',
          phone: '06 12 34 56 78',
        }),
      }),
    ]);
  });

  it('rejects the legal identity of a vendor who has not registered', async () => {
    await expect(handler.execute(TestRecordVendorLegalIdentity.valid())).rejects.toThrow(VendorNotRegisteredError);
    expect(store.newEvents()).toEqual([]);
  });

  function registerVendor() {
    store.seedWith('vendor-vendor-id', [{
      type: 'VendorRegistered',
      payload: { vendorId: 'vendor-id', registeredAt: '2026-09-01T08:00:00.000Z', email: 'marie@example.fr' },
      version: 1,
    }], { vendorId: 'vendor-id' });
  }
});
