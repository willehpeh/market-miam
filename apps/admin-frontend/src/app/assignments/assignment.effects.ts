import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap } from 'rxjs';
import { Assignments } from './assignments';
import { AssignSubdomain } from './assignment.state';

@Injectable()
export class AssignmentEffects {
  private readonly actions$ = inject(Actions);
  private readonly assignments = inject(Assignments);

  assign$ = createEffect(
    () => this.actions$.pipe(ofType(AssignSubdomain), exhaustMap(({ vendorId, subdomain }) => this.assignments.assign(vendorId, subdomain))),
    { dispatch: false },
  );
}
