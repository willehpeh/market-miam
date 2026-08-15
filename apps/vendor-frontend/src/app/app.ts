import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Layout } from './core/layout';

@Component({
  selector: 'mm-root',
  template: `<mm-layout />`,
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Layout]
})
export class App {}
