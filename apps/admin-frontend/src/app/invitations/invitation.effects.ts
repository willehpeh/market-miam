import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of } from 'rxjs';
import { InvitationAnswer, Invitations } from './invitations';
import { InviteVendor, InviteVendorRefused, InviteVendorSuccess } from './invitation.state';

@Injectable()
export class InvitationEffects {
  private readonly actions$ = inject(Actions);
  private readonly invitations = inject(Invitations);

  // One invitation at a time: another asked for while one is in flight is ignored, not
  // swapped in, since cancelling a POST cannot take back what the api may have received.
  invite$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InviteVendor),
      exhaustMap(({ email }) =>
        this.invitations
          .send(email)
          .pipe(
            map((answer) => answered(email, answer)),
            catchError(() => of(InviteVendorRefused({ refusal: 'not-sent' }))),
          ),
      ),
    ),
  );
}

// The api's answer to an invitation, as the state records it.
function answered(email: string, answer: InvitationAnswer) {
  return 'vendorId' in answer
    ? InviteVendorSuccess({ email, vendorId: answer.vendorId })
    : InviteVendorRefused({ refusal: answer.refusal });
}
