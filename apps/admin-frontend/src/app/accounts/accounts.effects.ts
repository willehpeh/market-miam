import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, switchMap } from 'rxjs';
import { Accounts } from './accounts';
import { LoadAccounts, LoadAccountsSuccess } from './accounts.state';

@Injectable()
export class AccountsEffects {
  private readonly actions$ = inject(Actions);
  private readonly accounts = inject(Accounts);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoadAccounts),
      switchMap(() => this.accounts.list().pipe(map((accounts) => LoadAccountsSuccess({ accounts })))),
    ),
  );
}
