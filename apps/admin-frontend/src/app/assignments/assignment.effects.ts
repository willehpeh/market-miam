import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, map } from 'rxjs';
import { Assignments } from './assignments';
import { AssignSubdomain, AssignSubdomainSuccess } from './assignment.state';

@Injectable()
export class AssignmentEffects {
  private readonly actions$ = inject(Actions);
  private readonly assignments = inject(Assignments);

  // One assignment at a time: another asked for while one is in flight is ignored, as cancelling
  // a PUT cannot take back what the api may have received.
  assign$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignSubdomain),
      exhaustMap(({ vendorId, subdomain }) =>
        this.assignments.assign(vendorId, subdomain).pipe(map(() => AssignSubdomainSuccess({ vendorId, subdomain }))),
      ),
    ),
  );
}
