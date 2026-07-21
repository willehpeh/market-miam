import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

interface AdminUser {
  email: string;
  vendorId: string;
  subdomain: string;
}

@Component({
  selector: 'admin-users',
  template: `
    <div class="mx-auto max-w-2xl p-6">
      <h1 class="mb-4 text-xl font-semibold text-gray-900">Users</h1>
      <ul class="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
        @for (user of users(); track user.email) {
          <li class="flex items-center justify-between gap-4 px-4 py-3">
            <span class="font-medium text-gray-900">{{ user.email }}</span>
            <span class="flex flex-col items-end gap-0.5 text-sm">
              @if (user.subdomain) {
                <span class="font-medium text-gray-700">{{ user.subdomain }}</span>
              }
              @if (user.vendorId) {
                <span class="font-mono text-gray-500">{{ user.vendorId }}</span>
              } @else {
                <span class="italic text-gray-400">no vendor ID</span>
              }
            </span>
          </li>
        } @empty {
          <li class="px-4 py-3 text-gray-500">No users</li>
        }
      </ul>
    </div>
  `,
})
export class UsersPage {
  protected readonly users = toSignal(inject(HttpClient).get<AdminUser[]>('/api/users'), {
    initialValue: [] as AdminUser[],
  });
}
