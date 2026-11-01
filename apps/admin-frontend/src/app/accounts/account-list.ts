import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

interface AccountListing {
  email: string | null;
  vendorId: string | null;
  subdomain: string | null;
}

// Every sign-in the identity provider holds, each with the storefront its vendor is
// reachable at — or a note that it has none yet, or is not a vendor at all.
@Component({
  selector: 'admin-account-list',
  template: `
    <h2 class="mt-8 mb-3 text-lg font-semibold text-gray-900">Accounts</h2>
    @switch (accounts()) {
      @case (null) {
        <p class="text-gray-500">Loading accounts…</p>
      }
      @case ('failed') {
        <p class="text-red-700">The accounts could not be loaded.</p>
      }
      @default {
        <ul class="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
          @for (account of listed(); track $index) {
            <li class="flex items-center justify-between gap-4 px-4 py-3">
              @if (account.email) {
                <span class="font-medium text-gray-900">{{ account.email }}</span>
              } @else {
                <span class="italic text-gray-400">no email</span>
              }
              <span class="flex flex-col items-end gap-0.5 text-sm">
                @if (account.subdomain) {
                  <a
                    class="text-gray-700 underline"
                    href="https://{{ account.subdomain }}.{{ storefrontBaseDomain }}"
                    target="_blank"
                    rel="noopener noreferrer"
                    >{{ account.subdomain }}.{{ storefrontBaseDomain }}</a
                  >
                } @else if (account.vendorId) {
                  <span class="italic text-gray-400">no subdomain</span>
                }
                @if (account.vendorId) {
                  <span class="font-mono text-gray-500">{{ account.vendorId }}</span>
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
    }
  `,
})
export class AccountList {
  protected readonly storefrontBaseDomain = environment.storefrontBaseDomain;
  protected readonly accounts = toSignal(
    inject(HttpClient)
      .get<AccountListing[]>(`${environment.apiBaseUrl}/api/ops/accounts`)
      .pipe(catchError(() => of('failed' as const))),
    { initialValue: null },
  );
  protected readonly listed = computed(() => {
    const accounts = this.accounts();
    return Array.isArray(accounts) ? accounts : [];
  });
}
