import { Component, computed, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { environment } from '../../environments/environment';
import { AssignmentRefusal } from './assignments';

interface Assignment {
  subdomain: string;
}

// Why an assignment didn't go, as the operator reads it beside the vendor's row.
const REFUSALS: Record<AssignmentRefusal, string> = {
  taken: 'Not assigned: that subdomain is taken, or this vendor has one already.',
  invalid: 'Not assigned: no storefront can have that subdomain.',
  'not-assigned': 'Not assigned: try again.',
};

// A vendor's subdomain to assign (ADR 0065), typed as the invitation's address is: on a phone
// first, without capitals or corrections, 44px controls and 16px text. What a subdomain may be
// is the api's to say. FormRoot cancels the native submission, which the site's CSP forbids.
@Component({
  selector: 'admin-assign-subdomain-form',
  imports: [FormRoot, FormField],
  host: { class: 'flex flex-col items-end gap-1' },
  template: `
    <form class="flex flex-wrap items-center justify-end gap-2" [formRoot]="assignment">
      <span class="flex items-center gap-1">
        <input
          type="text"
          autocomplete="off"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          class="min-h-11 w-40 rounded border border-gray-300 px-3 text-base"
          [attr.aria-label]="'Subdomain for ' + vendor()"
          [formField]="assignment.subdomain"
        />
        <span class="text-gray-500">.{{ storefrontBaseDomain }}</span>
      </span>
      <button
        type="submit"
        class="min-h-11 rounded bg-gray-900 px-3 text-white disabled:opacity-50"
        [attr.aria-label]="'Assign a subdomain to ' + vendor()"
        [disabled]="assigning()"
      >
        Assign
      </button>
    </form>
    @if (refusalMessage(); as message) {
      <span class="text-red-700" role="status">{{ message }}</span>
    }
  `,
})
export class AssignSubdomainForm {
  // Whom the subdomain is for, as the operator reads the row.
  readonly vendor = input.required<string>();
  readonly assigning = input(false);
  // Why this vendor's last assignment didn't go, the name still in the field.
  readonly refusal = input<AssignmentRefusal | null>(null);
  readonly assign = output<string>();
  protected readonly storefrontBaseDomain = environment.storefrontBaseDomain;

  protected readonly refusalMessage = computed(() => {
    const refusal = this.refusal();
    return refusal ? REFUSALS[refusal] : null;
  });

  private readonly model = signal<Assignment>({ subdomain: '' });

  protected readonly assignment = form(this.model, {
    submission: {
      action: async (field) => {
        this.assign.emit(field.subdomain().value());
        return undefined;
      },
    },
  });
}
