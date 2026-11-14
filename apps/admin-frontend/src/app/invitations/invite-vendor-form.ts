import { Component, output, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';

interface Invitation {
  email: string;
}

// The address to invite (ADR 0060), typed on a phone first: the email keyboard without
// capitals or corrections, 44px controls, 16px text so iOS doesn't zoom, and the field and
// button stacked until there is room for both on one line. FormRoot cancels the native
// submission, which the site's CSP forbids (form-action 'none').
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
    </form>
  `,
})
export class InviteVendorForm {
  readonly invite = output<string>();

  protected readonly invitation = form(signal<Invitation>({ email: '' }), {
    submission: {
      action: async (field) => {
        this.invite.emit(field.email().value());
        return undefined;
      },
    },
  });
}
