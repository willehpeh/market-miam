import { Component, inject, OnInit } from '@angular/core';
import { StorefrontFacade } from '../storefront/storefront.facade';

@Component({
  template: `
    <h1 class="text-3xl font-extrabold">Votre stand de marché,<br>en ligne en 10 minutes.</h1>
    @if (loading()) {
      <p id="storefront-loading">Nous préparons votre stand…</p>
    } @else if (view(); as storefront) {
      <section>
        <h2 id="storefront-name">{{ storefront.name }}</h2>
        <p id="storefront-description">{{ storefront.description }}</p>
        @if (storefront.imageReference) {
          <img [src]="storefront.imageReference" alt="">
        }
      </section>
    }
  `
})
export class Dashboard implements OnInit {
  private readonly storefront = inject(StorefrontFacade);

  readonly view = this.storefront.view;
  readonly loading = this.storefront.loading;

  ngOnInit(): void {
    this.storefront.load();
  }
}
