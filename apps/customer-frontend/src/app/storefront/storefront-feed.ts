import { DOCUMENT, inject, Injectable, linkedSignal, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { fromEvent, interval, merge } from 'rxjs';
import { environment } from '../../environments/environment';
import { StorefrontHost } from '../core/storefront-host';
import { CustomerStorefront } from './customer-storefront';
import { StorefrontViewModel, toViewModel } from './storefront-view-model';
import { broadcasting } from './live-status';

const LIVE_POLL_MS = 60_000;

// The storefront the pages render, kept fresh while the vendor is broadcasting: fetched
// once, then re-asked every minute and on the tab becoming visible — the real behaviour is
// open, walk, pocket the phone, pull it out at the stall (decision 8).
// Provided on the parent route, so one feed serves both children (decision 17).
@Injectable()
export class StorefrontFeed {
  private readonly document = inject(DOCUMENT);
  private readonly subdomain = inject(StorefrontHost).subdomain;

  // One reactive request owns the whole lifecycle. The server render waits for it (a
  // resource registers a pending task, which is what SSR stability is measured on) and the
  // hydration re-run is answered from the transfer cache rather than a second trip.
  // reload() supersedes an in-flight ask, so two triggers firing together cannot land out
  // of order.
  private readonly storefront = httpResource<StorefrontViewModel>(
    () =>
      this.subdomain
        ? { url: `${environment.apiBaseUrl}/api/public/storefront/${this.subdomain}` }
        : undefined,
    { parse: (dto) => toViewModel(dto as CustomerStorefront) },
  );

  // A failed re-ask keeps the last view: dropping the layout on a flaky market-hall tunnel
  // would be a bigger lie than a stale menu (decision 8). linkedSignal is what carries the
  // previous value across a request the resource itself has given up on.
  private readonly current = linkedSignal<StorefrontViewModel | undefined, StorefrontViewModel | null>({
    source: () => (this.storefront.hasValue() ? this.storefront.value() : undefined),
    computation: (fresh, previous) => fresh ?? previous?.value ?? null,
  });

  // Readable by anyone, writable only in here.
  readonly view = this.current.asReadonly();

  constructor() {
    // The server render must not hold a timer, and has no tab to watch.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    // Two triggers, one gated stream: the minute cadence and the tab coming back
    // (decision 8) — torn down with the route scope that provides the feed.
    merge(interval(LIVE_POLL_MS), fromEvent(this.document, 'visibilitychange'))
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (broadcasting(this.view()) && this.document.visibilityState === 'visible') {
          this.storefront.reload();
        }
      });
  }
}
