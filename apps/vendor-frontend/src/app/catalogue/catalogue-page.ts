import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Card } from '../core/card';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Card],
  template: `
    <mm-card back="/dashboard/storefront">
      <h1 class="text-2xl leading-tight">Votre catalogue</h1>
      <router-outlet />
    </mm-card>
  `,
})
export class CataloguePage {}
