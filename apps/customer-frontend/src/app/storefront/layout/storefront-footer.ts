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
      </p>
    </footer>
  `,
})
export class StorefrontFooter {
  readonly name = input.required<string>();
  readonly phone = input.required<string>();
}
