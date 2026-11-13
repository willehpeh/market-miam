import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

// Invites whoever signs in at an address (ADR 0060). Made for a phone first: the email
// keyboard without capitals or corrections, 44px controls, 16px text so iOS doesn't zoom,
// and the field and button stacked until there is room for both on one line.
@Component({
  selector: 'admin-invite-vendor-form',
  template: `
    <form class="mt-8" (submit)="invite($event)">
      <label for="invite-email" class="mb-2 block text-lg font-semibold text-gray-900">Invite a vendor</label>
      <div class="flex flex-col gap-2 sm:flex-row">
        <input
          id="invite-email"
          type="email"
          name="email"
          autocomplete="off"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          class="min-h-11 w-full rounded border border-gray-300 px-3 text-base"
          [value]="email()"
          (input)="typed($event)"
        />
        <button type="submit" class="min-h-11 rounded bg-gray-900 px-4 text-base text-white">Invite</button>
      </div>
      @if (sent()) {
        <p role="status" class="mt-2 text-green-800">Invitation sent</p>
      }
    </form>
  `,
})
export class InviteVendorForm {
  private readonly http = inject(HttpClient);
  protected readonly email = signal('');
  protected readonly sent = signal(false);

  protected typed(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  // The site's CSP forbids native form submission (form-action 'none'): the API sends it.
  protected invite(event: Event): void {
    event.preventDefault();
    this.http
      .post<{ vendorId: string }>(`${environment.apiBaseUrl}/api/ops/vendors`, { email: this.email() })
      .subscribe(() => this.sent.set(true));
  }
}
