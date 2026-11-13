import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface Invitation {
  email: string;
}

// Invites whoever signs in at an address (ADR 0060). Made for a phone first: the email
// keyboard without capitals or corrections, 44px controls, 16px text so iOS doesn't zoom,
// and the field and button stacked until there is room for both on one line. FormRoot
// cancels the native submission, which the site's CSP forbids (form-action 'none').
@Component({
  selector: 'admin-invite-vendor-form',
  imports: [FormRoot, FormField],
  template: `
    <form class="mt-8" [formRoot]="invitation">
      <label for="invite-email" class="mb-2 block text-lg font-semibold text-gray-900">Invite a vendor</label>
      <div class="flex flex-col gap-2 sm:flex-row">
        <input
          id="invite-email"
          type="email"
          autocomplete="off"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          class="min-h-11 w-full rounded border border-gray-300 px-3 text-base"
          [formField]="invitation.email"
        />
        <button type="submit" class="min-h-11 rounded bg-gray-900 px-4 text-base text-white">Invite</button>
      </div>
      @for (error of invitation.email().errors(); track error.kind) {
        <p role="alert" class="mt-2 text-red-700">{{ error.message }}</p>
      }
      @if (sent()) {
        <p role="status" class="mt-2 text-green-800">Invitation sent</p>
      }
    </form>
  `,
})
export class InviteVendorForm {
  private readonly http = inject(HttpClient);
  protected readonly sent = signal(false);
  protected readonly invitation = form(signal<Invitation>({ email: '' }), {
    submission: {
      action: async (field) => {
        try {
          await firstValueFrom(
            this.http.post<{ vendorId: string }>(`${environment.apiBaseUrl}/api/ops/vendors`, field().value()),
          );
        } catch (error) {
          if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict) {
            return { fieldTree: field.email, kind: 'server', message: 'An account already holds this address' };
          }
          throw error;
        }
        this.sent.set(true);
        return undefined;
      },
    },
  });
}
