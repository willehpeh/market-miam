import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { COPIED_NOTICE_DELAY, Share } from '../core/share';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { storefrontUrl } from '../storefront/storefront-url';
import { NextMenuCard } from '../market-days/next-menu-card';

@Component({
  selector: 'mm-storefront-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, NextMenuCard],
  host: { class: 'contents' },
  template: `
    <mm-next-menu-card />

    <mm-card>
      <h2 class="text-xl leading-tight">Votre vitrine</h2>

      @if (storefrontUrl(); as url) {
        <a [href]="url.href" target="_blank" rel="noopener" class="mt-4 block text-brand-deep">{{ url.label }}</a>
      }

      <div class="mt-4 grid grid-cols-2 gap-3">
        <a routerLink="/dashboard/information" class="btn-soft">
          <i class="fa-solid fa-pen" aria-hidden="true"></i> Modifier
        </a>
        <button type="button" class="btn-soft" (click)="share()">
          <i class="fa-solid" [class.fa-share-nodes]="!copied()" [class.fa-check]="copied()" aria-hidden="true"></i>
          {{ copied() ? 'Lien copié' : 'Partager' }}
        </button>
      </div>
    </mm-card>

    <mm-card>
      <ul class="divide-y divide-line">
        @for (destination of destinations; track destination.title) {
          <li>
            <a [routerLink]="destination.link" class="flex items-center gap-4 py-5 no-underline">
              <i class="fa-solid {{ destination.icon }} w-5 shrink-0 text-center text-brand" aria-hidden="true"></i>
              <p class="flex-1 font-bold text-ink">{{ destination.title }}</p>
              <span aria-hidden="true" class="text-2xl leading-none text-muted">›</span>
            </a>
          </li>
        }
      </ul>
    </mm-card>
  `
})
export class StorefrontHome {
  readonly copied = signal(false);

  // The vitrine's own card edits the vitrine; these are the other two things a customer
  // sees on it, and a vendor changes them far more often than their description.
  readonly destinations = [
    { title: 'Votre catalogue', link: '/dashboard/catalogue', icon: 'fa-utensils' },
    { title: 'Vos marchés', link: '/dashboard/markets', icon: 'fa-calendar-days' },
  ];
  private readonly storefront = inject(StorefrontFacade);
  readonly storefrontUrl = computed(() => storefrontUrl(this.storefront.view()?.subdomain));
  private readonly sharing = inject(Share);
  private readonly copiedNoticeDelay = inject(COPIED_NOTICE_DELAY);

  async share(): Promise<void> {
    const url = this.storefrontUrl();
    if (!url) {
      return;
    }
    const outcome = await this.sharing.link(this.storefront.view()?.name ?? '', url.href);
    if (outcome !== 'copied') {
      return;
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), this.copiedNoticeDelay);
  }
}
