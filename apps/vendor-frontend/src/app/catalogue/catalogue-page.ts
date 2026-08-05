import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Card } from '../core/card';
import { StorefrontFacade } from '../storefront/storefront.facade';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Card],
  template: `
    <mm-card [back]="backTo()">
      <h1 class="text-2xl leading-tight">Votre catalogue</h1>
      <router-outlet />
    </mm-card>
  `,
})
export class CataloguePage {
  readonly backTo = inject(StorefrontFacade).backTo;
}
