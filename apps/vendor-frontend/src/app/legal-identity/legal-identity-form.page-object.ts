import { fireEvent, render, RenderResult, screen } from '@testing-library/angular';
import { PageObject } from '../core/page-object';
import { LegalIdentityForm } from './legal-identity-form';
import { LegalIdentityFacade } from './legal-identity.facade';
import { FakeLegalIdentityFacade } from './fake.legal-identity.facade';
import { LegalIdentityView } from './legal-identity';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';

// What every vendor types in, entrepreneur individuel or société, before the TVA regime.
export type VendorDetails = Pick<LegalIdentityView, 'siret' | 'legalName' | 'address' | 'contactEmail' | 'phone'>;

// The legal-identity screen as the vendor meets it: the fields they fill in, found by the
// labels they read, and what they do with them (ADR 0062). It asserts nothing, and it never
// hands out a facade: a spec that wants to see a command builds the fake and passes it in.
export class LegalIdentityFormPageObject extends PageObject<LegalIdentityForm> {
  private constructor(view: RenderResult<LegalIdentityForm>) {
    super(view);
  }

  // The storefront lends the form its phone until an identity is recorded.
  static async render({
    legalIdentity = new FakeLegalIdentityFacade(),
    storefront = new FakeStorefrontFacade(),
  }: { legalIdentity?: LegalIdentityFacade; storefront?: StorefrontFacade } = {}) {
    const view = await render(LegalIdentityForm, {
      providers: [
        { provide: LegalIdentityFacade, useValue: legalIdentity },
        { provide: StorefrontFacade, useValue: storefront },
      ],
    });
    return new LegalIdentityFormPageObject(view);
  }

  privacyPolicyLink(): HTMLElement {
    return screen.getByRole('link', { name: /politique de confidentialité/i });
  }

  // Who the vendor is

  siretField(): HTMLInputElement {
    return screen.getByLabelText(/siret/i) as HTMLInputElement;
  }

  legalNameField(): HTMLInputElement {
    return screen.getByLabelText(/dénomination/i) as HTMLInputElement;
  }

  addressField(): HTMLInputElement {
    return screen.getByLabelText(/adresse/i) as HTMLInputElement;
  }

  contactEmailField(): HTMLInputElement {
    return screen.getByLabelText(/email de contact/i) as HTMLInputElement;
  }

  phoneField(): HTMLInputElement {
    return screen.getByLabelText(/téléphone/i) as HTMLInputElement;
  }

  enterSiret(siret: string): this {
    return this.type(this.siretField(), siret);
  }

  leaveSiret(): this {
    fireEvent.blur(this.siretField());
    return this.detectChanges();
  }

  enterLegalName(legalName: string): this {
    return this.type(this.legalNameField(), legalName);
  }

  enterAddress(address: string): this {
    return this.type(this.addressField(), address);
  }

  enterContactEmail(contactEmail: string): this {
    return this.type(this.contactEmailField(), contactEmail);
  }

  enterPhone(phone: string): this {
    return this.type(this.phoneField(), phone);
  }

  // The five, in the order the vendor meets them.
  fillIn({ siret, legalName, address, contactEmail, phone }: VendorDetails): this {
    return this.enterSiret(siret)
      .enterLegalName(legalName)
      .enterAddress(address)
      .enterContactEmail(contactEmail)
      .enterPhone(phone);
  }

  // Whichever field the label names, for a spec that goes through several in turn.
  enterIn(label: RegExp, value: string): this {
    return this.type(screen.getByLabelText(label), value);
  }

  // Entrepreneur individuel or société, and what a société adds

  individualRadio(): HTMLElement {
    return screen.getByLabelText(/entrepreneur individuel/i);
  }

  companyRadio(): HTMLElement {
    return screen.getByLabelText(/société/i);
  }

  legalFormField(): HTMLInputElement {
    return screen.getByLabelText(/forme juridique/i) as HTMLInputElement;
  }

  shareCapitalField(): HTMLInputElement {
    return screen.getByLabelText(/capital social/i) as HTMLInputElement;
  }

  registryCityField(): HTMLInputElement {
    return screen.getByLabelText(/ville du greffe/i) as HTMLInputElement;
  }

  legalRepresentativeField(): HTMLInputElement {
    return screen.getByLabelText(/représentant légal/i) as HTMLInputElement;
  }

  chooseIndividual(): this {
    return this.press(this.individualRadio());
  }

  chooseCompany(): this {
    return this.press(this.companyRadio());
  }

  enterLegalForm(legalForm: string): this {
    return this.type(this.legalFormField(), legalForm);
  }

  enterShareCapital(shareCapital: string): this {
    return this.type(this.shareCapitalField(), shareCapital);
  }

  enterRegistryCity(registryCity: string): this {
    return this.type(this.registryCityField(), registryCity);
  }

  enterLegalRepresentative(legalRepresentative: string): this {
    return this.type(this.legalRepresentativeField(), legalRepresentative);
  }

  // The TVA regime

  assujettiRadio(): HTMLElement {
    return screen.getByLabelText(/assujetti/i);
  }

  franchiseRadio(): HTMLElement {
    return screen.getByLabelText(/franchise en base/i);
  }

  chooseFranchise(): this {
    return this.press(this.franchiseRadio());
  }

  // The médiateur, and the warning shown while none is named

  mediatorNameField(): HTMLInputElement {
    return screen.getByLabelText(/nom du médiateur/i) as HTMLInputElement;
  }

  mediatorUrlField(): HTMLInputElement {
    return screen.getByLabelText(/site du médiateur/i) as HTMLInputElement;
  }

  // One of those the warning suggests.
  mediatorLink(name: RegExp): HTMLElement {
    return screen.getByRole('link', { name });
  }

  mediatorWarningCheckbox(): HTMLElement {
    return screen.getByLabelText(/je sais que je dois désigner un médiateur/i);
  }

  queryMediatorWarningCheckbox(): HTMLElement | null {
    return screen.queryByLabelText(/je sais que je dois désigner un médiateur/i);
  }

  enterMediatorName(name: string): this {
    return this.type(this.mediatorNameField(), name);
  }

  enterMediatorUrl(url: string): this {
    return this.type(this.mediatorUrlField(), url);
  }

  acknowledgeMediatorWarning(): this {
    return this.press(this.mediatorWarningCheckbox());
  }

  // Saving

  saveButton(): HTMLElement {
    return screen.getByRole('button', { name: /enregistrer/i });
  }

  status(): HTMLElement {
    return screen.getByRole('status');
  }

  alert(): HTMLElement {
    return screen.getByRole('alert');
  }

  save(): this {
    return this.press(this.saveButton());
  }
}
