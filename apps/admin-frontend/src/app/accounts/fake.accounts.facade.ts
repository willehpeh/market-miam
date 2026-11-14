import { Injectable, signal } from '@angular/core';
import { AccountsFacade } from './accounts.facade';
import { AccountListing } from './accounts';

@Injectable()
export class FakeAccountsFacade implements AccountsFacade {
  readonly accounts = signal<AccountListing[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  loads = 0;

  load(): void {
    this.loads++;
  }
}
