import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-storefront-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <footer class="mt-4 border-t border-line px-5 py-8">
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
      </p>
    </footer>
  `,
})
export class StorefrontFooter {
  readonly name = input.required<string>();
  readonly phone = input.required<string>();
}
