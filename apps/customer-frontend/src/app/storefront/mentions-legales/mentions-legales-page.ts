import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorefrontHost } from '../../core/storefront-host';
import { StorefrontFeed } from '../storefront-feed';
import { StorefrontMetadata } from '../storefront-metadata';
import { ComingSoonPage } from '../coming-soon/coming-soon-page';

// Market Miam hosts the vendor's page, and Render hosts Market Miam (ADR 0054): the same
// two the marketing site's mentions légales name.
const MARKET_MIAM = {
  nom: 'Market Miam — William Alexander, entrepreneur individuel',
  adresse: '95 avenue de Verdun, 93230 Romainville, France',
  email: 'contact@marketmiam.fr',
};
const RENDER = {
  nom: 'Render Services, Inc.',
  adresse: '525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis',
  telephone: '+1 415 319 8186',
};

// The éditeur block (LCEN art. 6-III-1 and 19), then policy B, whose wording a lawyer
// approved on 2026-09-23: a change to it goes back to them first.
@Component({
  selector: 'app-mentions-legales-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ComingSoonPage],
  template: `
    @if (storefront(); as storefront) {
      @switch (storefront.status) {
        @case ('published') {
          @if (storefront.editeur; as editeur) {
            <main class="mx-auto min-h-dvh max-w-xl bg-surface-sunk lg:max-w-6xl">
              <header class="flex items-center gap-3 bg-surface px-5 py-4 lg:px-8">
                <a
                  routerLink="/"
                  queryParamsHandling="preserve"
                  class="flex min-w-0 items-center gap-2 font-bold text-brand"
                >
                  <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                  <span class="truncate">{{ storefront.name }}</span>
                </a>
                <img src="logo-transparent.png" alt="Market Miam" class="ml-auto h-6 w-auto" />
              </header>

              <div class="legal max-w-2xl space-y-3 px-5 py-6 text-ink-soft lg:px-8 lg:py-10">
                <h1 class="text-3xl font-bold tracking-tight text-ink lg:text-4xl">Mentions légales</h1>

                <h2>Éditeur</h2>
                <p>
                  @if (editeur.company; as company) {
                    {{ editeur.legalName }}, {{ company.legalForm }} au capital de {{ company.shareCapital }}<br />
                    RCS {{ company.registryCity }} {{ company.siren }}<br />
                  } @else {
                    {{ editeur.legalName }}<br />
                  }
                  {{ editeur.address }}<br />
                  SIRET {{ editeur.siret }}<br />
                  @if (editeur.vatNumber) {
                    N° de TVA intracommunautaire : {{ editeur.vatNumber }}<br />
                  } @else {
                    TVA non applicable, art. 293 B du CGI<br />
                  }
                  Contact : <a [href]="'mailto:' + editeur.contactEmail">{{ editeur.contactEmail }}</a> ·
                  <a [href]="'tel:' + editeur.phone">{{ editeur.phone }}</a>
                </p>
                <p>Directeur de la publication : {{ editeur.publicationDirector }}</p>
                @if (editeur.mediator; as mediator) {
                  <p>
                    Médiateur de la consommation : {{ mediator.name }} ·
                    <a [href]="mediator.url" target="_blank" rel="noopener">{{ mediator.url }}</a>
                  </p>
                }

                <h2>Hébergeur</h2>
                <p>
                  {{ marketMiam.nom }}<br />
                  {{ marketMiam.adresse }}<br />
                  <a [href]="'mailto:' + marketMiam.email">{{ marketMiam.email }}</a>
                </p>
                <p>
                  Market Miam est lui-même hébergé par {{ render.nom }}, {{ render.adresse }},
                  {{ render.telephone }}.
                </p>

                <h1 class="second text-2xl font-bold tracking-tight text-ink">Confidentialité</h1>

                <h2>Qui fait quoi</h2>
                <p>
                  Cette vitrine est éditée par {{ editeur.legalName }}, qui en rédige le contenu. Elle fonctionne sur Market
                  Miam, qui l'héberge et traite les quelques données techniques décrites ci-dessous. Responsable de ce
                  traitement : William Alexander (Market Miam), 95 avenue de Verdun, 93230 Romainville,
                  <a href="mailto:contact@marketmiam.fr">contact&#64;marketmiam.fr</a>.
                </p>

                <h2>Ce que nous collectons</h2>
                <p>
                  Rien de ce que vous tapez, puisque la vitrine ne contient ni compte, ni formulaire, ni commande en ligne.
                  Afficher la page suffit cependant à transmettre votre adresse IP et les informations habituelles de votre
                  navigateur :
                </p>
                <div class="overflow-x-auto">
                  <table>
                    <thead>
                      <tr><th>Prestataire</th><th>Pourquoi</th><th>Où</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Render Services, Inc. (États-Unis)</td><td>Afficher la page</td><td>Serveurs à Francfort (UE) ; société américaine</td></tr>
                      <tr><td>Cloudinary Inc. (États-Unis)</td><td>Afficher les photos</td><td>États-Unis</td></tr>
                      <tr>
                        <td>Hound Technology, Inc. — Honeycomb (États-Unis)</td>
                        <td>Diagnostiquer les pannes, quand la page s'actualise d'elle-même pendant un marché</td>
                        <td>États-Unis</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  Ces données servent uniquement à vous envoyer la page, à la protéger contre les abus et à diagnostiquer les
                  pannes. Base légale : intérêt légitime. Elles sont conservées 7 jours chez Render, 60 jours chez Honeycomb, et
                  jusqu'à un an chez Cloudinary (90 jours en ligne, puis en archive), et leur transfert hors de l'UE est encadré
                  par le Data Privacy Framework UE–États-Unis, et à défaut par les clauses contractuelles types de la Commission
                  européenne.
                </p>
                <p>
                  Une copie de ces garanties est disponible sur demande à
                  <a href="mailto:contact@marketmiam.fr">contact&#64;marketmiam.fr</a>.
                </p>
                <p>
                  Les polices de caractères et les icônes sont servies par le site lui-même : aucun autre service tiers n'est
                  contacté.
                </p>

                <h2>Cookies</h2>
                <p>Aucun. Il n'y a pas de mesure d'audience, pas de publicité, et donc pas de bandeau de consentement.</p>

                <h2>Si vous appelez le traiteur</h2>
                <p>
                  Le numéro affiché est celui de {{ editeur.legalName }}. Ce que vous échangez par téléphone, commande
                  comprise, relève de {{ editeur.legalName }} et non de Market Miam.
                </p>

                <h2>Vos droits</h2>
                <p>
                  Accès, rectification, effacement, limitation, opposition : écrivez à
                  <a href="mailto:contact@marketmiam.fr">contact&#64;marketmiam.fr</a>, réponse sous un mois. Comme nous ne
                  connaissons de vous qu'une adresse IP, nous aurons sans doute besoin de la date et de l'heure de votre
                  visite pour vous retrouver. Réclamation possible auprès de la CNIL
                  (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).
                </p>
              </div>
            </main>
          } @else {
            <main class="grid min-h-dvh place-items-center bg-surface-sunk p-8 text-center">
              <p class="text-ink-soft">Page introuvable</p>
            </main>
          }
        }
        @case ('coming-soon') {
          <app-coming-soon [name]="storefront.name" />
        }
      }
    } @else {
      <main class="grid min-h-dvh place-items-center bg-surface-sunk p-8 text-center">
        <p class="text-ink-soft">Boutique introuvable</p>
      </main>
    }
  `,
  styles: `
    .legal h2 { margin-top: 1.5rem; font-weight: 700; color: var(--color-ink); }
    .legal h1.second { margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid var(--color-line); }
    .legal a { color: var(--color-brand); }
    .legal table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .legal th, .legal td { text-align: left; vertical-align: top; padding: 0.5rem 0.75rem 0.5rem 0; border-bottom: 1px solid var(--color-line); }
    .legal th { color: var(--color-ink); }
  `,
})
export class MentionsLegalesPage {
  protected readonly storefront = inject(StorefrontFeed).view;
  protected readonly marketMiam = MARKET_MIAM;
  protected readonly render = RENDER;

  constructor() {
    const metadata = inject(StorefrontMetadata);
    const origin = inject(StorefrontHost).origin;
    effect(() => metadata.set(this.storefront(), `${origin}/mentions-legales`));
  }
}
