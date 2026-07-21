import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'admin-root',
  template: '<router-outlet />',
})
export class App {}
