import { Component, effect, inject, untracked } from '@angular/core';
import { AuthFacade } from '../core/auth/auth.facade';
import { AccountList } from '../accounts/account-list';
import { AccountsFacade } from '../accounts/accounts.facade';
import { InviteVendorForm } from '../invitations/invite-vendor-form';
import { InvitationFacade } from '../invitations/invitation.facade';

// Sign in, then invite vendors and see the accounts. The api guards every operator route: if
// it turns this sign-in away, loading the accounts says so, and nothing else is offered.
@Component({
  selector: 'admin-operator-page',
  imports: [AccountList, InviteVendorForm],
  template: `
    <div class="mx-auto max-w-2xl p-6">
      <h1 class="mb-4 text-xl font-semibold text-gray-900">Market Miam admin</h1>
      @if (auth.status() === 'pending') {
        <p class="text-gray-500">Loading…</p>
      } @else if (auth.userId(); as signedIn) {
        <div class="flex items-center justify-between gap-4">
          @if (accounts.refused()) {
            <p class="text-red-700">The API refused this sign-in.</p>
          } @else {
            <p class="text-gray-900">
              Signed in as <span class="font-mono">{{ signedIn }}</span>
            </p>
          }
          <button type="button" class="rounded border border-gray-300 px-3 py-1.5 text-sm" (click)="auth.logout()">
            Sign out
          </button>
        </div>
        @if (!accounts.refused()) {
          <admin-invite-vendor-form
            [sending]="invitations.sending()"
            [refusal]="invitations.refusal()"
            [sentTo]="invitations.sentTo()"
            (invite)="invitations.invite($event)"
          />
          <admin-account-list
            [accounts]="accounts.accounts()"
            [loading]="accounts.loading()"
            [failed]="accounts.failed()"
          />
        }
      } @else {
        <button type="button" class="rounded bg-gray-900 px-3 py-1.5 text-sm text-white" (click)="auth.login()">
          Sign in with GitHub
        </button>
      }
    </div>
  `,
})
export class OperatorPage {
  protected readonly auth = inject(AuthFacade);
  protected readonly invitations = inject(InvitationFacade);
  protected readonly accounts = inject(AccountsFacade);

  constructor() {
    // At each sign-in.
    effect(() => {
      if (this.auth.userId()) {
        untracked(() => this.accounts.load());
      }
    });
  }
}
