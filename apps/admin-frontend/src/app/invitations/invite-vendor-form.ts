import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { InvitationRefusal } from './invitations';

interface Invitation {
  email: string;
}

// Why an invitation didn't go, as the operator reads it.
const REFUSALS: Record<InvitationRefusal, string> = {
  'email-in-use': 'An account already holds this address',
  'invalid-email': "That isn't a valid email address",
  'not-sent': "The invitation couldn't be sent. Try again.",
};

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
          [attr.aria-describedby]="refusalMessage() ? 'invite-refusal' : null"
          [formField]="invitation.email"
        />
        <button
          type="submit"
          class="min-h-11 rounded bg-gray-900 px-4 text-base text-white disabled:opacity-50"
          [disabled]="sending()"
        >
          Invite
        </button>
      </div>
      @if (refusalMessage(); as message) {
        <p id="invite-refusal" role="alert" class="mt-2 text-red-700">{{ message }}</p>
      }
      @if (sentTo(); as address) {
        <p role="status" class="mt-2 text-green-800">Invitation sent to {{ address }}</p>
      }
    </form>
  `,
})
export class InviteVendorForm {
  readonly sending = input(false);
  readonly refusal = input<InvitationRefusal | null>(null);
  readonly sentTo = input<string | null>(null);
  readonly invite = output<string>();

  protected readonly refusalMessage = computed(() => {
    const refusal = this.refusal();
    return refusal ? REFUSALS[refusal] : null;
  });

  // Empty again whenever an invitation has gone, ready for the next address.
  private readonly model = linkedSignal<string | null, Invitation>({
    source: this.sentTo,
    computation: () => ({ email: '' }),
  });

  protected readonly invitation = form(this.model, {
    submission: {
      action: async (field) => {
        this.invite.emit(field.email().value());
        return undefined;
      },
    },
  });
}
