import { screen } from '@testing-library/angular';
import { LegalIdentityFormPageObject, VendorDetails } from './legal-identity-form.page-object';
import { FakeLegalIdentityFacade } from './fake.legal-identity.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';

const SIRET = '73282932000074';

// An entrepreneur individuel's details: all the form asks of one but the TVA regime and the médiateur.
const individual: VendorDetails = {
  siret: SIRET,
  legalName: 'Margaux Dupont',
  address: '12 rue des Halles, 69004 Lyon',
  contactEmail: 'contact@margaux.fr',
  phone: '06 12 34 56 78',
};

describe('LegalIdentityForm', () => {
  it('saves the identity of an entrepreneur individuel with their médiateur', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    const page = await LegalIdentityFormPageObject.render({ legalIdentity });

    page
      .fillIn(individual)
      .chooseFranchise()
      .enterMediatorName('CM2C')
      .enterMediatorUrl('https://www.cm2c.net')
      .save();

    expect(legalIdentity.savedIdentity).toEqual({
      siret: SIRET,
      legalName: 'Margaux Dupont',
      address: '12 rue des Halles, 69004 Lyon',
      contactEmail: 'contact@margaux.fr',
      phone: '06 12 34 56 78',
      vatRegime: 'franchise',
      mediatorName: 'CM2C',
      mediatorUrl: 'https://www.cm2c.net',
      legalForm: null,
      shareCapital: null,
      registryCity: null,
      legalRepresentative: null,
    });
  });

  // ADR 0054: warned, not required. The tick is what makes a null médiateur in the log
  // evidence that the warning was shown: the form cannot send one without it.
  it('saves without a médiateur only once the vendor acknowledges the warning', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    const page = await LegalIdentityFormPageObject.render({ legalIdentity });

    page.fillIn(individual).chooseFranchise();

    expect(page.mediatorLink(/cm2c/i)).toHaveAttribute('href', 'https://www.cm2c.net');
    expect(page.mediatorLink(/medicys/i)).toHaveAttribute('href', 'https://www.medicys.fr');
    expect(page.mediatorLink(/ame/i)).toHaveAttribute('href', 'https://www.mediationconso-ame.com');
    expect(page.saveButton()).toBeDisabled();

    page.acknowledgeMediatorWarning().save();

    expect(legalIdentity.savedIdentity).toMatchObject({ mediatorName: null, mediatorUrl: null });
  });

  it('does not ask for the acknowledgement once a médiateur is named', async () => {
    const page = await LegalIdentityFormPageObject.render();

    page.enterMediatorName('CM2C');

    expect(page.queryMediatorWarningCheckbox()).not.toBeInTheDocument();
  });

  it('asks for the recorded identity when opened', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    await LegalIdentityFormPageObject.render({ legalIdentity });

    expect(legalIdentity.loadCalled).toBe(true);
  });

  it('prefills the form from the recorded identity', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    const page = await LegalIdentityFormPageObject.render({ legalIdentity });
    legalIdentity.identity.set({
      siret: SIRET,
      legalName: 'Margaux SARL',
      address: '12 rue des Halles, 69004 Lyon',
      contactEmail: 'contact@margaux.fr',
      phone: '04 78 00 00 00',
      vatRegime: 'assujetti',
      mediatorName: 'CM2C',
      mediatorUrl: 'https://www.cm2c.net',
      legalForm: 'SARL',
      shareCapital: '5 000 €',
      registryCity: 'Lyon',
      legalRepresentative: 'Margaux Dupont',
    });
    page.detectChanges();

    expect(page.siretField()).toHaveValue(SIRET);
    expect(page.legalNameField()).toHaveValue('Margaux SARL');
    expect(page.addressField()).toHaveValue('12 rue des Halles, 69004 Lyon');
    expect(page.contactEmailField()).toHaveValue('contact@margaux.fr');
    expect(page.phoneField()).toHaveValue('04 78 00 00 00');
    expect(page.assujettiRadio()).toBeChecked();
    expect(page.mediatorNameField()).toHaveValue('CM2C');
    expect(page.mediatorUrlField()).toHaveValue('https://www.cm2c.net');
    expect(page.companyRadio()).toBeChecked();
    expect(page.legalFormField()).toHaveValue('SARL');
    expect(page.shareCapitalField()).toHaveValue('5 000 €');
    expect(page.registryCityField()).toHaveValue('Lyon');
    expect(page.legalRepresentativeField()).toHaveValue('Margaux Dupont');
  });

  // ADR 0056: its own copy, prefilled from the storefront's.
  it("prefills the phone from the storefront's until an identity is recorded", async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    const storefront = new FakeStorefrontFacade();
    const page = await LegalIdentityFormPageObject.render({ legalIdentity, storefront });
    storefront.view.set({
      name: 'La Table de Margaux',
      description: '',
      phone: '06 12 34 56 78',
      imageReference: '',
      subdomain: 'margaux',
      published: true,
      cartePricesVisible: true,
    });
    legalIdentity.identity.set(null);
    page.detectChanges();

    expect(page.phoneField()).toHaveValue('06 12 34 56 78');
  });

  it('looks the company up once the vendor has typed a valid SIRET', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    const page = await LegalIdentityFormPageObject.render({ legalIdentity });

    page.enterSiret('7328293200007').enterSiret('73282932000075').enterSiret('732 829 320 00074');

    expect(legalIdentity.lookedUp).toEqual([SIRET]);
  });

  it('fills in what the registry knows, leaving what the vendor typed', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    const page = await LegalIdentityFormPageObject.render({ legalIdentity });
    page.enterContactEmail('contact@margaux.fr').enterSiret(SIRET);

    legalIdentity.company.set({ legalName: 'MARGAUX SARL', address: '12 RUE DES HALLES 69004 LYON', individual: false });
    page.detectChanges();

    expect(page.siretField()).toHaveValue(SIRET);
    expect(page.legalNameField()).toHaveValue('MARGAUX SARL');
    expect(page.addressField()).toHaveValue('12 RUE DES HALLES 69004 LYON');
    expect(page.contactEmailField()).toHaveValue('contact@margaux.fr');
    expect(page.companyRadio()).toBeChecked();
  });

  it('asks the vendor to type it themselves when the registry finds nothing', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    const page = await LegalIdentityFormPageObject.render({ legalIdentity });
    page.enterSiret(SIRET);

    legalIdentity.company.set(null);
    page.detectChanges();

    expect(screen.getByText(/introuvable/i)).toBeVisible();
  });

  it('says why it cannot be saved yet, and describes the button with it', async () => {
    const page = await LegalIdentityFormPageObject.render();
    page.enterSiret(SIRET).enterLegalName('Margaux Dupont').enterMediatorName('CM2C');

    const button = page.saveButton();
    expect(button).toHaveAccessibleDescription(expect.stringContaining('adresse'));
    expect(button).toHaveAccessibleDescription(expect.stringContaining('email de contact'));
    expect(button).toHaveAccessibleDescription(expect.stringContaining('téléphone'));
    expect(button).toHaveAccessibleDescription(expect.stringContaining('régime de TVA'));
    expect(button).toHaveAccessibleDescription(expect.stringContaining('site du médiateur'));
    expect(button).not.toHaveAccessibleDescription(expect.stringContaining('SIRET'));
    expect(button).not.toHaveAccessibleDescription(expect.stringContaining('dénomination'));
  });

  it('asks for the acknowledgement when no médiateur is named', async () => {
    const page = await LegalIdentityFormPageObject.render();
    page.fillIn(individual).chooseFranchise();

    expect(screen.getByText(/cochez l'avertissement sur le médiateur/i)).toBeVisible();
  });

  it('stops saying so once everything is given', async () => {
    const page = await LegalIdentityFormPageObject.render();
    page.fillIn(individual).chooseFranchise().acknowledgeMediatorWarning();

    expect(page.saveButton()).not.toHaveAttribute('aria-describedby');
  });

  it('confirms once the identity is saved', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    const page = await LegalIdentityFormPageObject.render({ legalIdentity });

    legalIdentity.saved.set(true);
    page.detectChanges();

    expect(page.status()).toHaveTextContent(/mentions légales enregistrées/i);
  });

  it('says so when the save fails', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    const page = await LegalIdentityFormPageObject.render({ legalIdentity });

    legalIdentity.saveFailed.set(true);
    page.detectChanges();

    expect(page.alert()).toHaveTextContent(/l'enregistrement a échoué/i);
  });

  it('says how these details are handled', async () => {
    const page = await LegalIdentityFormPageObject.render();

    expect(page.privacyPolicyLink()).toHaveAttribute('href', 'https://marketmiam.fr/confidentialite-traiteurs');
  });

  it('says the phone is published', async () => {
    const page = await LegalIdentityFormPageObject.render();

    expect(page.phoneField()).toHaveAccessibleDescription(/publié sur votre vitrine/i);
  });

  it('saves what a société owes on top', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    const page = await LegalIdentityFormPageObject.render({ legalIdentity });
    page.fillIn(individual).chooseFranchise().acknowledgeMediatorWarning();

    page.chooseCompany();
    expect(page.saveButton()).toBeDisabled();
    page
      .enterLegalForm('SARL')
      .enterShareCapital('5 000 €')
      .enterRegistryCity('Lyon')
      .enterLegalRepresentative('Margaux Dupont')
      .save();

    expect(legalIdentity.savedIdentity).toMatchObject({
      legalForm: 'SARL',
      shareCapital: '5 000 €',
      registryCity: 'Lyon',
      legalRepresentative: 'Margaux Dupont',
    });
  });

  it('sends no société details for an entrepreneur individuel, even once typed', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    const page = await LegalIdentityFormPageObject.render({ legalIdentity });
    page
      .fillIn(individual)
      .chooseFranchise()
      .acknowledgeMediatorWarning()
      .chooseCompany()
      .enterLegalForm('SARL')
      .chooseIndividual();

    page.save();

    expect(legalIdentity.savedIdentity).toMatchObject({
      legalForm: null,
      shareCapital: null,
      registryCity: null,
      legalRepresentative: null,
    });
  });

  it.each([/siret/i, /dénomination/i, /adresse/i, /email de contact/i, /téléphone/i])(
    'will not save without %s',
    async (label) => {
      const page = await LegalIdentityFormPageObject.render();
      page.fillIn(individual).chooseFranchise().acknowledgeMediatorWarning();

      page.enterIn(label, '  ');

      expect(page.saveButton()).toBeDisabled();
    },
  );

  it('will not save without a TVA regime', async () => {
    const page = await LegalIdentityFormPageObject.render();
    page.fillIn(individual).acknowledgeMediatorWarning();

    expect(page.saveButton()).toBeDisabled();
  });

  it('says a SIRET with a wrong check digit is not valid, before any save', async () => {
    const page = await LegalIdentityFormPageObject.render();

    page.enterSiret('73282932000075').leaveSiret();

    expect(screen.getByText(/ce siret n'est pas valide/i)).toBeVisible();
  });

  it('accepts a SIRET typed with spaces', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    const page = await LegalIdentityFormPageObject.render({ legalIdentity });
    page.fillIn(individual).chooseFranchise().enterSiret('732 829 320 00074').acknowledgeMediatorWarning();

    page.save();

    expect(legalIdentity.savedIdentity?.siret).toBe('732 829 320 00074');
  });

  it('will not save a médiateur named without its site', async () => {
    const page = await LegalIdentityFormPageObject.render();

    page.fillIn(individual).chooseFranchise().enterMediatorName('CM2C');

    expect(page.saveButton()).toBeDisabled();
  });
});
