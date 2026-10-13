import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-storefront-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  imports: [RouterLink],
  template: `
    <footer class="mt-4 border-t border-line px-5 py-8 lg:px-8">
      <p class="text-xl font-bold text-ink">{{ name() }}</p>
      <p class="mt-1 text-ink-soft">
        Réservations &amp; commandes :
        <a class="text-brand" [href]="'tel:' + phone()">{{ phone() }}</a>
      </p>
      <!-- The "Logiciel libre" link is the AGPL §13 source offer for this storefront.
           Storefront visitors never see the marketing site, so the offer has to live
           here, in the interface they actually interact with. -->
      <p class="mt-6 border-t border-line pt-4 text-sm text-ink-soft">
        Vitrine mijotée par
        <a
          class="font-semibold text-brand"
          href="https://marketmiam.fr"
          target="_blank"
          rel="noopener"
        >
          Market Miam
        </a>
        ·
        <a
          class="text-brand"
          href="https://marketmiam.fr/mentions-legales#licence"
          target="_blank"
          rel="noopener"
        >
          Logiciel libre
        </a>
        <!-- ponytail: hidden while the vendor has no legal identity, so the live client's page
             never links an empty notice. Retire once they have provided theirs: from then on
             every published storefront has one, and slice 9's gate keeps it so. -->
        @if (mentionsLegales()) {
          ·
          <a class="text-brand" routerLink="/mentions-legales" queryParamsHandling="preserve">Mentions légales</a>
        }
      </p>
    </footer>
  `,
})
export class StorefrontFooter {
  readonly name = input.required<string>();
  readonly phone = input.required<string>();
  readonly mentionsLegales = input.required<boolean>();
}
