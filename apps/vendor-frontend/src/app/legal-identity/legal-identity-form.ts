import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { applyWhen, form, FormField, validate } from '@angular/forms/signals';
import { LegalIdentityFacade } from './legal-identity.facade';
import { isSiret } from './siret';
import { LegalIdentityView } from './legal-identity';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { Card } from '../core/card';

@Component({
  selector: 'mm-legal-identity-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, FormField],
  template: `
    <mm-card back="/dashboard">
      <form (submit)="submit($event)">
        <h1 class="text-xl leading-tight">Vos mentions légales</h1>
        <p class="mt-2 text-sm text-ink-soft">
          Elles apparaissent sur votre vitrine, comme la loi le demande. Notre
          <a href="https://marketmiam.fr/confidentialite-traiteurs" target="_blank" rel="noopener" class="underline">politique de confidentialité</a>
          dit comment nous les conservons.
        </p>

        <div class="mt-5 space-y-4">
          <div>
            <label for="siret" class="field-label">SIRET</label>
            <input
              id="siret"
              type="text"
              inputmode="numeric"
              class="mt-1"
              [formField]="fields.siret"
              (input)="lookUp($event)"
              [attr.aria-invalid]="siretRejected()"
              [attr.aria-describedby]="siretRejected() ? 'siret-error' : null"
            />
            @if (notFound()) {
              <p role="status" class="mt-1 text-xs text-muted">Entreprise introuvable dans le répertoire Sirene : saisissez vos informations.</p>
            }
            @if (siretRejected()) {
              <p id="siret-error" role="alert" class="mt-1 text-xs text-danger">Ce SIRET n'est pas valide : vérifiez les 14 chiffres.</p>
            }
          </div>
          <div>
            <label for="legalName" class="field-label">Dénomination légale</label>
            <input id="legalName" type="text" class="mt-1" [formField]="fields.legalName" />
          </div>
          <div>
            <label for="address" class="field-label">Adresse professionnelle</label>
            <input id="address" type="text" class="mt-1" [formField]="fields.address" />
          </div>
          <div>
            <label for="contactEmail" class="field-label">Email de contact</label>
            <input id="contactEmail" type="email" class="mt-1" [formField]="fields.contactEmail" />
          </div>
          <div>
            <label for="phone" class="field-label">Téléphone</label>
            <input id="phone" type="tel" class="mt-1" [formField]="fields.phone" aria-describedby="phone-hint" />
            <p id="phone-hint" class="mt-1 text-xs text-muted">Publié sur votre vitrine, dans vos mentions légales.</p>
          </div>
          <fieldset>
            <legend class="field-label">Statut</legend>
            <label><input type="radio" value="individual" [formField]="fields.structure" /> Entrepreneur individuel</label>
            <label><input type="radio" value="company" [formField]="fields.structure" /> Société (SARL, SAS…)</label>
          </fieldset>
          @if (fields.structure().value() === 'company') {
            <div>
              <label for="legalForm" class="field-label">Forme juridique</label>
              <input id="legalForm" type="text" class="mt-1" [formField]="fields.legalForm" placeholder="ex. SARL" />
            </div>
            <div>
              <label for="shareCapital" class="field-label">Capital social</label>
              <input id="shareCapital" type="text" class="mt-1" [formField]="fields.shareCapital" placeholder="ex. 5 000 €" />
            </div>
            <div>
              <label for="registryCity" class="field-label">Ville du greffe (RCS)</label>
              <input id="registryCity" type="text" class="mt-1" [formField]="fields.registryCity" placeholder="ex. Lyon" />
            </div>
            <div>
              <label for="legalRepresentative" class="field-label">Représentant légal</label>
              <input id="legalRepresentative" type="text" class="mt-1" [formField]="fields.legalRepresentative" />
            </div>
          }
          <fieldset>
            <legend class="field-label">Régime de TVA</legend>
            <label><input type="radio" value="assujetti" [formField]="fields.vatRegime" /> Assujetti à la TVA</label>
            <label><input type="radio" value="franchise" [formField]="fields.vatRegime" /> Franchise en base</label>
          </fieldset>
          <div>
            <label for="mediatorName" class="field-label">Nom du médiateur</label>
            <input id="mediatorName" type="text" class="mt-1" [formField]="fields.mediatorName" />
          </div>
          <div>
            <label for="mediatorUrl" class="field-label">Site du médiateur</label>
            <input id="mediatorUrl" type="url" class="mt-1" [formField]="fields.mediatorUrl" />
          </div>
          @if (!mediatorNamed()) {
            <div class="rounded-card border border-line-strong bg-surface-sunk p-4 text-sm">
              <p>
                La loi (art. L616-1 du Code de la consommation) vous oblige à proposer un médiateur de la
                consommation à vos clients. Sans médiateur, vous risquez une amende de la DGCCRF.
                Abonnement d'environ 50 à 100 € par an, par exemple :
              </p>
              <ul class="mt-2 list-disc pl-5">
                @for (mediator of mediators; track mediator.name) {
                  <li><a [href]="mediator.url" target="_blank" rel="noopener" class="underline">{{ mediator.name }}</a></li>
                }
              </ul>
              <label class="mt-3 flex items-start gap-2">
                <input type="checkbox" [formField]="fields.mediatorWarningAcknowledged" />
                <span>Je sais que je dois désigner un médiateur, et que l'amende me revient si je n'en ai pas.</span>
              </label>
            </div>
          }
        </div>

        <button
          type="submit"
          class="mt-6 flex w-full max-w-xs mx-auto justify-center"
          [disabled]="fields().invalid()"
          [attr.aria-describedby]="blockers().length ? 'submit-blockers' : null"
        >
          Enregistrer
        </button>
        @if (blockers().length) {
          <ul id="submit-blockers" class="mt-2 space-y-0.5 text-center text-xs text-muted">
            @for (blocker of blockers(); track blocker) {
              <li>{{ blocker }}</li>
            }
          </ul>
        }
        @if (saveFailed()) {
          <p role="alert" class="mt-2 text-center text-xs text-danger">L'enregistrement a échoué. Vérifiez vos informations et réessayez.</p>
        }
      </form>
    </mm-card>

    @if (saved()) {
      <div role="status" class="fixed inset-0 m-auto h-fit w-fit rounded-card bg-surface p-6 text-center shadow-frame">
        <div aria-hidden="true" class="mx-auto grid size-11 place-items-center rounded-full bg-brand-soft text-lg">✓</div>
        <p class="mt-3 font-bold text-ink">Mentions légales enregistrées</p>
      </div>
    }
  `,
})
export class LegalIdentityForm {
  private readonly legalIdentity = inject(LegalIdentityFacade);

  protected readonly mediators = [
    { name: 'CM2C', url: 'https://www.cm2c.net' },
    { name: 'Medicys', url: 'https://www.medicys.fr' },
    { name: 'AME', url: 'https://www.mediationconso-ame.com' },
  ];

  private readonly storefront = inject(StorefrontFacade);

  protected readonly saved = this.legalIdentity.saved;
  protected readonly saveFailed = this.legalIdentity.saveFailed;

  // What the registry finds lands over what the vendor typed, field by field. A newly
  // loaded identity, or storefront phone, starts the form over.
  private readonly model = linkedSignal({
    source: () => ({
      identity: this.legalIdentity.identity(),
      phone: this.storefront.view()?.phone ?? '',
      company: this.legalIdentity.company(),
    }),
    computation: ({ identity, phone, company }, previous): IdentityModel => {
      if (!previous || identity !== previous.source.identity || phone !== previous.source.phone) {
        return modelOf(identity, phone);
      }
      return company
        ? {
            ...previous.value,
            legalName: company.legalName,
            address: company.address,
            structure: company.individual ? 'individual' : 'company',
          }
        : previous.value;
    },
  });

  protected readonly fields = form(this.model, (path) => {
    // Trimmed, not `required`: the value objects reject a value of spaces.
    for (const field of [path.legalName, path.address, path.contactEmail, path.phone, path.vatRegime]) {
      validate(field, ({ value }) => (value().trim() === '' ? { kind: 'required' } : undefined));
    }
    // An EI has no capital and is its own directeur de la publication (ADR 0054).
    applyWhen(
      path,
      ({ valueOf }) => valueOf(path.structure) === 'company',
      (company) => {
        for (const field of [company.legalForm, company.shareCapital, company.registryCity, company.legalRepresentative]) {
          validate(field, ({ value }) => (value().trim() === '' ? { kind: 'required' } : undefined));
        }
      },
    );
    validate(path.siret, ({ value }) => (isSiret(value()) ? undefined : { kind: 'siret' }));
    // A médiateur is named with its site or not at all (the Mediator value object's rule).
    validate(path.mediatorUrl, ({ value, valueOf }) =>
      !!valueOf(path.mediatorName).trim() !== !!value().trim() ? { kind: 'mediatorPair' } : undefined,
    );
    validate(path.mediatorWarningAcknowledged, ({ value, valueOf }) =>
      !valueOf(path.mediatorName).trim() && !value() ? { kind: 'mediatorWarning' } : undefined,
    );
  });

  protected readonly siretRejected = computed(() => {
    const siret = this.fields.siret();
    return siret.touched() && siret.value().trim() !== '' && siret.invalid();
  });

  // A disabled button is not an explanation, and a field's own message waits for a touch.
  protected readonly blockers = computed(() => {
    const fields = this.fields;
    const missing = [
      { field: fields.siret, label: 'un SIRET valide' },
      { field: fields.legalName, label: 'la dénomination légale' },
      { field: fields.address, label: "l'adresse professionnelle" },
      { field: fields.contactEmail, label: "l'email de contact" },
      { field: fields.phone, label: 'le téléphone' },
      { field: fields.vatRegime, label: 'le régime de TVA' },
      { field: fields.legalForm, label: 'la forme juridique' },
      { field: fields.shareCapital, label: 'le capital social' },
      { field: fields.registryCity, label: 'la ville du greffe' },
      { field: fields.legalRepresentative, label: 'le représentant légal' },
      { field: fields.mediatorUrl, label: 'le site du médiateur' },
    ]
      .filter(({ field }) => field().invalid())
      .map(({ label }) => `Indiquez ${label}.`);
    return fields.mediatorWarningAcknowledged().invalid()
      ? [...missing, "Cochez l'avertissement sur le médiateur."]
      : missing;
  });

  protected readonly notFound = computed(() => this.legalIdentity.company() === null);

  protected readonly mediatorNamed = computed(() => !!this.fields.mediatorName().value().trim());

  constructor() {
    this.legalIdentity.load();
  }

  protected lookUp(event: Event): void {
    const siret = (event.target as HTMLInputElement).value;
    if (isSiret(siret)) {
      this.legalIdentity.lookUpCompany(siret.replace(/\s/g, ''));
    }
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const value = this.fields().value();
    const company = value.structure === 'company';
    this.legalIdentity.save({
      siret: value.siret,
      legalName: value.legalName,
      address: value.address,
      contactEmail: value.contactEmail,
      phone: value.phone,
      vatRegime: value.vatRegime,
      mediatorName: value.mediatorName.trim() || null,
      mediatorUrl: value.mediatorUrl.trim() || null,
      legalForm: company ? value.legalForm : null,
      shareCapital: company ? value.shareCapital : null,
      registryCity: company ? value.registryCity : null,
      legalRepresentative: company ? value.legalRepresentative : null,
    });
  }
}

type IdentityModel = ReturnType<typeof modelOf>;

// The acknowledgement starts unticked even when a null médiateur is on record: each save
// is its own evidence that the warning was shown.
function modelOf(identity: LegalIdentityView | null | undefined, storefrontPhone: string) {
  return {
    siret: identity?.siret ?? '',
    legalName: identity?.legalName ?? '',
    address: identity?.address ?? '',
    contactEmail: identity?.contactEmail ?? '',
    phone: identity?.phone ?? storefrontPhone,
    vatRegime: identity?.vatRegime ?? '',
    mediatorName: identity?.mediatorName ?? '',
    mediatorUrl: identity?.mediatorUrl ?? '',
    mediatorWarningAcknowledged: false,
    structure: identity?.legalForm ? 'company' : 'individual',
    legalForm: identity?.legalForm ?? '',
    shareCapital: identity?.shareCapital ?? '',
    registryCity: identity?.registryCity ?? '',
    legalRepresentative: identity?.legalRepresentative ?? '',
  };
}
