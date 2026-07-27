import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'admin-root',
  template: `
    <div class="grid min-h-svh grid-rows-[1fr_auto]">
      <!-- The outlet inserts the routed component as its *sibling*, so it needs a
           wrapper to keep the footer in the second grid row. -->
      <main>
        <router-outlet />
      </main>
      <!-- AGPL §13 source offer for the admin app. -->
      <footer class="px-6 py-4 text-sm text-gray-500">
        <a
          class="text-gray-700 underline"
          href="https://marketmiam.fr/mentions-legales#licence"
          target="_blank"
          rel="noopener"
        >
          Logiciel libre
        </a>
      </footer>
    </div>
  `,
})
export class App {}
