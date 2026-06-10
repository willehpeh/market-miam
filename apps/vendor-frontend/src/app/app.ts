import { Component } from '@angular/core';
import { Layout } from './core/layout';

@Component({
  selector: 'mm-root',
  template: `<mm-layout />`,
  styleUrl: './app.scss',
  imports: [Layout]
})
export class App {}
