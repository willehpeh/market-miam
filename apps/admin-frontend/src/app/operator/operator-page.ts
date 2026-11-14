import { Component, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from '../core/auth/auth';
import { AccountList } from '../accounts/account-list';
import { InviteVendorForm } from '../invitations/invite-vendor-form';
import { InvitationFacade } from '../invitations/invitation.facade';
import { AccountsFacade } from '../accounts/accounts.facade';

interface Operator {
  operatorId: string;
}

type Whoami = Operator | 'refused' | null;

// Sign in, then show who the operator API says you are and, once it has said so, the
// accounts. Nothing else is asked of the api before it has confirmed the operator.
@Component({
  selector: 'admin-operator-page',
  imports: [AccountList, InviteVendorForm],
  template: `
    <div class="mx-auto max-w-2xl p-6">
      <h1 class="mb-4 text-xl font-semibold text-gray-900">Market Miam admin</h1>
      @if (loading()) {
        <p class="text-gray-500">Loading…</p>
      } @else if (signedIn()) {
        <div class="flex items-center justify-between gap-4">
          @switch (whoami()) {
            @case (null) {
              <p class="text-gray-500">Checking with the API…</p>
            }
            @case ('refused') {
              <p class="text-red-700">The API refused this sign-in.</p>
            }
            @default {
              <p class="text-gray-900">
                Signed in as <span class="font-mono">{{ operatorId() }}</span>
              </p>
            }
          }
          <button type="button" class="rounded border border-gray-300 px-3 py-1.5 text-sm" (click)="logout()">
            Sign out
          </button>
        </div>
        @if (operatorId()) {
          <admin-invite-vendor-form
            [sending]="invitations.sending()"
            [refusal]="invitations.refusal()"
            [sentTo]="invitations.sentTo()"
            (invite)="invitations.invite($event)"
          />
          <admin-account-list />
        }
      } @else {
        <button type="button" class="rounded bg-gray-900 px-3 py-1.5 text-sm text-white" (click)="login()">
          Sign in with GitHub
        </button>
      }
    </div>
  `,
})
export class OperatorPage {
  private readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);
  protected readonly invitations = inject(InvitationFacade);
  private readonly accounts = inject(AccountsFacade);
  private readonly userId$ = this.auth.userId$();

  protected readonly loading = toSignal(this.auth.isLoading$(), { initialValue: true });
  protected readonly signedIn = toSignal(this.userId$.pipe(map(Boolean)), { initialValue: false });
  protected readonly whoami = toSignal(
    this.userId$.pipe(switchMap((userId) => (userId ? this.fetchWhoami() : of(null)))),
    { initialValue: null as Whoami },
  );

  constructor() {
    // Once the api has confirmed the operator, and again at each new sign-in.
    effect(() => {
      if (this.operatorId()) {
        untracked(() => this.accounts.load());
      }
    });
  }

  protected operatorId(): string {
    const whoami = this.whoami();
    return whoami && whoami !== 'refused' ? whoami.operatorId : '';
  }

  protected login(): void {
    this.auth.login();
  }

  protected logout(): void {
    this.auth.logout();
  }

  private fetchWhoami(): Observable<Whoami> {
    return this.http
      .get<Operator>(`${environment.apiBaseUrl}/api/ops/whoami`)
      .pipe(catchError(() => of('refused' as const)));
  }
}
