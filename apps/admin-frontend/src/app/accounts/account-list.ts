import { Component, input, output, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AccountListing } from './accounts';
import { AssignSubdomainForm } from '../assignments/assign-subdomain-form';
import { AssignmentRefusal, RefusedAssignment } from '../assignments/assignments';

// Every sign-in the identity provider holds, each with the storefront its vendor is
// reachable at — or a note that it has none yet, or is not a vendor at all — and the
// invitations whose accounts have yet to open. A vendor with no subdomain can be given one, and
// a vendor can be erased, once confirmed.
@Component({
  selector: 'admin-account-list',
  imports: [AssignSubdomainForm],
  template: `
    <h2 class="mt-8 mb-3 text-lg font-semibold text-gray-900">Accounts</h2>
    @if (loading()) {
      <p class="text-gray-500">Loading accounts…</p>
    } @else if (loadFailed()) {
      <p class="text-red-700">The accounts could not be loaded.</p>
    } @else {
      <ul class="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
        <!-- By whom each row is, so what is typed in a row stays with them as rows join. -->
        @for (account of accounts(); track account.vendorId ?? account.email ?? $index) {
          <li class="flex items-center justify-between gap-4 px-4 py-3">
            @if (account.email) {
              <span class="font-medium text-gray-900">{{ account.email }}</span>
            } @else {
              <span class="italic text-gray-400">no email</span>
            }
            <span class="flex flex-col items-end gap-0.5 text-sm">
              @if (account.erased) {
                <span class="italic text-red-700">erased</span>
              } @else {
                @if (account.invited) {
                  <span class="italic text-amber-700">invited</span>
                }
                @if (account.subdomain) {
                  <a
                    class="text-gray-700 underline"
                    href="https://{{ account.subdomain }}.{{ storefrontBaseDomain }}"
                    target="_blank"
                    rel="noopener noreferrer"
                    >{{ account.subdomain }}.{{ storefrontBaseDomain }}</a
                  >
                } @else if (account.vendorId && !account.invited) {
                  <span class="italic text-gray-400">no subdomain</span>
                }
              }
              @if (account.vendorId; as vendorId) {
                <span class="font-mono text-gray-500">{{ vendorId }}</span>
                @if (!account.erased) {
                  @if (!account.subdomain) {
                    <admin-assign-subdomain-form
                      [vendor]="account.email ?? vendorId"
                      [assigning]="assigning()"
                      [refusal]="assignmentRefusalFor(vendorId)"
                      (assign)="assign.emit({ vendorId, subdomain: $event })"
                    />
                  }
                  @if (confirming() === vendorId) {
                    <span class="flex flex-wrap items-center justify-end gap-2">
                      <span class="text-red-700">Erase for good?</span>
                      <button
                        type="button"
                        class="min-h-11 rounded bg-red-700 px-3 text-white"
                        (click)="confirmErasure(vendorId)"
                      >
                        Confirm erasure
                      </button>
                      <button type="button" class="min-h-11 rounded border border-gray-300 px-3" (click)="confirming.set(null)">
                        Cancel
                      </button>
                    </span>
                  } @else {
                    <button
                      type="button"
                      class="min-h-11 rounded border border-red-300 px-3 text-red-700 disabled:opacity-50"
                      [attr.aria-label]="'Erase ' + (account.email ?? vendorId)"
                      [disabled]="erasing()"
                      (click)="confirming.set(vendorId)"
                    >
                      Erase
                    </button>
                  }
                }
                @if (erasureFailed() === vendorId) {
                  <span class="text-red-700" role="status">Not erased: try again.</span>
                }
              } @else {
                <span class="italic text-gray-400">not a vendor</span>
              }
            </span>
          </li>
        } @empty {
          <li class="px-4 py-3 text-gray-500">No accounts</li>
        }
      </ul>
    }
  `,
})
export class AccountList {
  readonly accounts = input<AccountListing[]>([]);
  readonly loading = input(false);
  readonly loadFailed = input(false);
  // An erasure the api has not answered: one at a time, so none other is offered meanwhile.
  readonly erasing = input(false);
  // The vendor whose last erasure did not go.
  readonly erasureFailed = input<string | null>(null);
  // An assignment the api has not answered: one at a time, so none other is offered meanwhile.
  readonly assigning = input(false);
  // The vendor whose last assignment did not go, and why.
  readonly assignmentRefused = input<RefusedAssignment | null>(null);
  readonly erase = output<string>();
  readonly assign = output<{ vendorId: string; subdomain: string }>();
  protected readonly storefrontBaseDomain = environment.storefrontBaseDomain;
  // The vendor whose erasure waits for the operator to confirm it: it cannot be undone (ADR 0058).
  protected readonly confirming = signal<string | null>(null);

  protected assignmentRefusalFor(vendorId: string): AssignmentRefusal | null {
    const refused = this.assignmentRefused();
    return refused?.vendorId === vendorId ? refused.refusal : null;
  }

  protected confirmErasure(vendorId: string): void {
    this.confirming.set(null);
    this.erase.emit(vendorId);
  }
}
