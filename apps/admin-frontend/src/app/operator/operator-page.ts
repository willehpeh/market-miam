import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from '../core/auth/auth';

interface Operator {
  operatorId: string;
}

type Whoami = Operator | 'refused' | null;

// The walking skeleton's page: sign in, then show who the operator API says you are —
// the whole chain from the identity provider to the api's guard and back.
@Component({
  selector: 'admin-operator-page',
  template: `
    <div class="mx-auto max-w-2xl p-6">
      <h1 class="mb-4 text-xl font-semibold text-gray-900">Market Miam admin</h1>
      @if (loading()) {
        <p class="text-gray-500">Loading…</p>
      } @else if (signedIn()) {
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
        <button type="button" class="mt-4 rounded border border-gray-300 px-3 py-1.5 text-sm" (click)="logout()">
          Sign out
        </button>
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
  private readonly userId$ = this.auth.userId$();

  protected readonly loading = toSignal(this.auth.isLoading$(), { initialValue: true });
  protected readonly signedIn = toSignal(this.userId$.pipe(map(Boolean)), { initialValue: false });
  protected readonly whoami = toSignal(
    this.userId$.pipe(switchMap((userId) => (userId ? this.fetchWhoami() : of(null)))),
    { initialValue: null as Whoami },
  );

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
