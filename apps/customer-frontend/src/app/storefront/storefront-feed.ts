import { DestroyRef, DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, EMPTY, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { CustomerStorefront } from './customer-storefront';
import { StorefrontViewModel, toViewModel } from './storefront-view-model';
import { broadcasting } from './live-status';

const LIVE_POLL_MS = 60_000;

// The storefront the pages render, kept fresh while the vendor is broadcasting: seeded by
// the resolver's one fetch, then re-asked every minute and on the tab becoming visible —
// the real behaviour is open, walk, pocket the phone, pull it out at the stall (decision 8).
// Provided on the parent route, so one feed serves both children (decision 17).
@Injectable()
export class StorefrontFeed {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  readonly view = signal<StorefrontViewModel | null>(null);
  private subdomain: string | null = null;

  constructor() {
    // The server render must not hold a timer, and has no tab to watch.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    const tick = () => {
      if (broadcasting(this.view()) && this.document.visibilityState === 'visible') {
        this.refresh();
      }
    };
    const poll = setInterval(tick, LIVE_POLL_MS);
    this.document.addEventListener('visibilitychange', tick);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(poll);
      this.document.removeEventListener('visibilitychange', tick);
    });
  }

  seed(view: StorefrontViewModel | null, subdomain: string | null): void {
    this.view.set(view);
    this.subdomain = subdomain;
  }

  // A failed re-ask keeps the last view: dropping the layout on a flaky market-hall
  // tunnel would be a bigger lie than a stale menu (decision 8).
  refresh(): void {
    if (!this.subdomain) {
      return;
    }
    this.http
      .get<CustomerStorefront>(`${environment.apiBaseUrl}/api/public/storefront/${this.subdomain}`)
      .pipe(map(toViewModel), catchError(() => EMPTY))
      .subscribe(view => this.view.set(view));
  }
}
