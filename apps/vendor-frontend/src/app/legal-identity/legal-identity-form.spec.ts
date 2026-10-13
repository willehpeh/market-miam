import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LegalIdentityForm } from './legal-identity-form';
import { LegalIdentityFacade } from './legal-identity.facade';
import { FakeLegalIdentityFacade } from './fake.legal-identity.facade';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';

const SIRET = '73282932000074';

async function renderForm() {
  const view = await render(LegalIdentityForm, {
    providers: [
      { provide: LegalIdentityFacade, useClass: FakeLegalIdentityFacade },
      { provide: StorefrontFacade, useClass: FakeStorefrontFacade },
    ],
  });
  const legalIdentity = TestBed.inject(LegalIdentityFacade) as FakeLegalIdentityFacade;
  const storefront = TestBed.inject(StorefrontFacade) as FakeStorefrontFacade;
  return { view, legalIdentity, storefront };
}

function type(label: RegExp, value: string) {
  fireEvent.input(screen.getByLabelText(label), { target: { value } });
}

function fillIndividual() {
  type(/siret/i, SIRET);
  type(/dénomination/i, 'Margaux Dupont');
  type(/adresse/i, '12 rue des Halles, 69004 Lyon');
  type(/email de contact/i, 'contact@margaux.fr');
  type(/téléphone/i, '06 12 34 56 78');
  fireEvent.click(screen.getByLabelText(/franchise en base/i));
}

function save() {
  fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
}

describe('LegalIdentityForm', () => {
  it('saves the identity of an entrepreneur individuel with their médiateur', async () => {
    const { legalIdentity } = await renderForm();

    fillIndividual();
    type(/nom du médiateur/i, 'CM2C');
    type(/site du médiateur/i, 'https://www.cm2c.net');
    save();

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
    const { legalIdentity } = await renderForm();

    fillIndividual();

    expect(screen.getByRole('link', { name: /cm2c/i })).toHaveAttribute('href', 'https://www.cm2c.net');
    expect(screen.getByRole('link', { name: /medicys/i })).toHaveAttribute('href', 'https://www.medicys.fr');
    expect(screen.getByRole('link', { name: /ame/i })).toHaveAttribute('href', 'https://www.mediationconso-ame.com');
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/je sais que je dois désigner un médiateur/i));
    save();

    expect(legalIdentity.savedIdentity).toMatchObject({ mediatorName: null, mediatorUrl: null });
  });

  it('does not ask for the acknowledgement once a médiateur is named', async () => {
    await renderForm();

    type(/nom du médiateur/i, 'CM2C');

    expect(screen.queryByLabelText(/je sais que je dois désigner un médiateur/i)).not.toBeInTheDocument();
  });

  it('asks for the recorded identity when opened', async () => {
    const { legalIdentity } = await renderForm();

    expect(legalIdentity.loadCalled).toBe(true);
  });

  it('prefills the form from the recorded identity', async () => {
    const { view, legalIdentity } = await renderForm();
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
    view.detectChanges();

    expect(screen.getByLabelText(/siret/i)).toHaveValue(SIRET);
    expect(screen.getByLabelText(/dénomination/i)).toHaveValue('Margaux SARL');
    expect(screen.getByLabelText(/adresse/i)).toHaveValue('12 rue des Halles, 69004 Lyon');
    expect(screen.getByLabelText(/email de contact/i)).toHaveValue('contact@margaux.fr');
    expect(screen.getByLabelText(/téléphone/i)).toHaveValue('04 78 00 00 00');
    expect(screen.getByLabelText(/assujetti/i)).toBeChecked();
    expect(screen.getByLabelText(/nom du médiateur/i)).toHaveValue('CM2C');
    expect(screen.getByLabelText(/site du médiateur/i)).toHaveValue('https://www.cm2c.net');
    expect(screen.getByLabelText(/société/i)).toBeChecked();
    expect(screen.getByLabelText(/forme juridique/i)).toHaveValue('SARL');
    expect(screen.getByLabelText(/capital social/i)).toHaveValue('5 000 €');
    expect(screen.getByLabelText(/ville du greffe/i)).toHaveValue('Lyon');
    expect(screen.getByLabelText(/représentant légal/i)).toHaveValue('Margaux Dupont');
  });

  // ADR 0056: its own copy, prefilled from the storefront's.
  it("prefills the phone from the storefront's until an identity is recorded", async () => {
    const { view, legalIdentity, storefront } = await renderForm();
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
    view.detectChanges();

    expect(screen.getByLabelText(/téléphone/i)).toHaveValue('06 12 34 56 78');
  });

  it('looks the company up once the vendor has typed a valid SIRET', async () => {
    const { legalIdentity } = await renderForm();

    type(/siret/i, '7328293200007');
    type(/siret/i, '73282932000075');
    type(/siret/i, '732 829 320 00074');

    expect(legalIdentity.lookedUp).toEqual([SIRET]);
  });

  it('fills in what the registry knows, leaving what the vendor typed', async () => {
    const { view, legalIdentity } = await renderForm();
    type(/email de contact/i, 'contact@margaux.fr');
    type(/siret/i, SIRET);

    legalIdentity.company.set({ legalName: 'MARGAUX SARL', address: '12 RUE DES HALLES 69004 LYON', individual: false });
    view.detectChanges();

    expect(screen.getByLabelText(/siret/i)).toHaveValue(SIRET);
    expect(screen.getByLabelText(/dénomination/i)).toHaveValue('MARGAUX SARL');
    expect(screen.getByLabelText(/adresse/i)).toHaveValue('12 RUE DES HALLES 69004 LYON');
    expect(screen.getByLabelText(/email de contact/i)).toHaveValue('contact@margaux.fr');
    expect(screen.getByLabelText(/société/i)).toBeChecked();
  });

  it('asks the vendor to type it themselves when the registry finds nothing', async () => {
    const { view, legalIdentity } = await renderForm();
    type(/siret/i, SIRET);

    legalIdentity.company.set(null);
    view.detectChanges();

    expect(screen.getByText(/introuvable/i)).toBeVisible();
  });

  it('says why it cannot be saved yet, and describes the button with it', async () => {
    const { view } = await renderForm();
    type(/siret/i, SIRET);
    type(/dénomination/i, 'Margaux Dupont');
    type(/nom du médiateur/i, 'CM2C');
    view.detectChanges();

    const describedBy = screen.getByRole('button', { name: /enregistrer/i }).getAttribute('aria-describedby');
    const blockers = view.container.querySelector(`#${describedBy}`)?.textContent;
    expect(blockers).toContain('adresse');
    expect(blockers).toContain('email de contact');
    expect(blockers).toContain('téléphone');
    expect(blockers).toContain('régime de TVA');
    expect(blockers).toContain('site du médiateur');
    expect(blockers).not.toContain('SIRET');
    expect(blockers).not.toContain('dénomination');
  });

  it('asks for the acknowledgement when no médiateur is named', async () => {
    const { view } = await renderForm();
    fillIndividual();
    view.detectChanges();

    expect(screen.getByText(/cochez l'avertissement sur le médiateur/i)).toBeVisible();
  });

  it('stops saying so once everything is given', async () => {
    const { view } = await renderForm();
    fillIndividual();
    fireEvent.click(screen.getByLabelText(/je sais que je dois désigner un médiateur/i));
    view.detectChanges();

    expect(screen.getByRole('button', { name: /enregistrer/i })).not.toHaveAttribute('aria-describedby');
  });

  it('confirms once the identity is saved', async () => {
    const { view, legalIdentity } = await renderForm();

    legalIdentity.saved.set(true);
    view.detectChanges();

    expect(screen.getByRole('status')).toHaveTextContent(/mentions légales enregistrées/i);
  });

  it('says so when the save fails', async () => {
    const { view, legalIdentity } = await renderForm();

    legalIdentity.saveFailed.set(true);
    view.detectChanges();

    expect(screen.getByRole('alert')).toHaveTextContent(/l'enregistrement a échoué/i);
  });

  it('says how these details are handled', async () => {
    await renderForm();

    expect(screen.getByRole('link', { name: /politique de confidentialité/i })).toHaveAttribute(
      'href',
      'https://marketmiam.fr/confidentialite-traiteurs',
    );
  });

  it('says the phone is published', async () => {
    await renderForm();

    expect(screen.getByLabelText(/téléphone/i)).toHaveAccessibleDescription(/publié sur votre vitrine/i);
  });

  it('saves what a société owes on top', async () => {
    const { legalIdentity } = await renderForm();
    fillIndividual();
    fireEvent.click(screen.getByLabelText(/je sais que je dois désigner un médiateur/i));

    fireEvent.click(screen.getByLabelText(/société/i));
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
    type(/forme juridique/i, 'SARL');
    type(/capital social/i, '5 000 €');
    type(/ville du greffe/i, 'Lyon');
    type(/représentant légal/i, 'Margaux Dupont');
    save();

    expect(legalIdentity.savedIdentity).toMatchObject({
      legalForm: 'SARL',
      shareCapital: '5 000 €',
      registryCity: 'Lyon',
      legalRepresentative: 'Margaux Dupont',
    });
  });

  it('sends no société details for an entrepreneur individuel, even once typed', async () => {
    const { legalIdentity } = await renderForm();
    fillIndividual();
    fireEvent.click(screen.getByLabelText(/je sais que je dois désigner un médiateur/i));
    fireEvent.click(screen.getByLabelText(/société/i));
    type(/forme juridique/i, 'SARL');
    fireEvent.click(screen.getByLabelText(/entrepreneur individuel/i));

    save();

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
      await renderForm();
      fillIndividual();
      fireEvent.click(screen.getByLabelText(/je sais que je dois désigner un médiateur/i));

      type(label, '  ');

      expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
    },
  );

  it('will not save without a TVA regime', async () => {
    await renderForm();
    type(/siret/i, SIRET);
    type(/dénomination/i, 'Margaux Dupont');
    type(/adresse/i, '12 rue des Halles, 69004 Lyon');
    type(/email de contact/i, 'contact@margaux.fr');
    type(/téléphone/i, '06 12 34 56 78');
    fireEvent.click(screen.getByLabelText(/je sais que je dois désigner un médiateur/i));

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });

  it('says a SIRET with a wrong check digit is not valid, before any save', async () => {
    const { view } = await renderForm();

    type(/siret/i, '73282932000075');
    fireEvent.blur(screen.getByLabelText(/siret/i));
    view.detectChanges();

    expect(screen.getByText(/ce siret n'est pas valide/i)).toBeVisible();
  });

  it('accepts a SIRET typed with spaces', async () => {
    const { legalIdentity } = await renderForm();
    fillIndividual();
    type(/siret/i, '732 829 320 00074');
    fireEvent.click(screen.getByLabelText(/je sais que je dois désigner un médiateur/i));

    save();

    expect(legalIdentity.savedIdentity?.siret).toBe('732 829 320 00074');
  });

  it('will not save a médiateur named without its site', async () => {
    await renderForm();

    fillIndividual();
    type(/nom du médiateur/i, 'CM2C');

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });
});
