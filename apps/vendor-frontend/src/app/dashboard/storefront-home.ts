import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, timer } from 'rxjs';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { COPIED_NOTICE_DELAY, Share } from '../core/share';
import { StorefrontView } from '../storefront/storefront';
import { storefrontUrl } from '../storefront/storefront-url';

@Component({
  selector: 'mm-storefront-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card],
  host: { class: 'contents' },
  template: `
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
        <!-- Its own row: three labels across a phone would wrap, and "Lien copié" is the
             widest of them. -->
        <a routerLink="/dashboard/qr-code" class="btn-soft col-span-2">
          <i class="fa-solid fa-qrcode" aria-hidden="true"></i> QR code pour votre stand
        </a>
      </div>
    </mm-card>
  `
})
export class StorefrontHome {
  readonly storefront = input.required<StorefrontView>();

  readonly copied = signal(false);

  readonly destinations: {
    title: string, link: string, icon: string
  }[] = [
    { title: 'Votre catalogue', link: '/dashboard/catalogue', icon: 'fa-utensils' },
    { title: 'Vos marchés', link: '/dashboard/markets', icon: 'fa-calendar-days' },
    { title: 'Mentions légales', link: '/dashboard/legal-identity', icon: 'fa-scale-balanced' }
  ];
  readonly storefrontUrl = computed(() => storefrontUrl(this.storefront().subdomain));
  private readonly sharing = inject(Share);
  private readonly copiedNoticeDelay = inject(COPIED_NOTICE_DELAY);
  private readonly copies = new Subject<void>();

  constructor() {
    this.copies.pipe(
      switchMap(() => timer(this.copiedNoticeDelay)),
      takeUntilDestroyed()
    ).subscribe(() => this.copied.set(false));
  }

  async share(): Promise<void> {
    const url = this.storefrontUrl();
    if (!url) {
      return;
    }
    const outcome = await this.sharing.link(this.storefront().name, url.href);
    if (outcome !== 'copied') {
      return;
    }
    this.copied.set(true);
    this.copies.next();
  }
}
