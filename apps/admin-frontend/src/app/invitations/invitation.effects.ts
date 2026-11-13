import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, map } from 'rxjs';
import { Invitations } from './invitations';
import { InviteVendor, InviteVendorSuccess } from './invitation.state';

@Injectable()
export class InvitationEffects {
  private readonly actions$ = inject(Actions);
  private readonly invitations = inject(Invitations);

  // One invitation at a time: another asked for while one is in flight is ignored, not
  // swapped in, since cancelling a POST cannot take back what the api may have received.
  invite$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InviteVendor),
      exhaustMap(({ email }) => this.invitations.send(email).pipe(map(() => InviteVendorSuccess({ email })))),
    ),
  );
}
