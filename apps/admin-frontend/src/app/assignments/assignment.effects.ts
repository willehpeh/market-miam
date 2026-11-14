import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, map } from 'rxjs';
import { AssignmentAnswer, Assignments } from './assignments';
import { AssignSubdomain, AssignSubdomainRefused, AssignSubdomainSuccess } from './assignment.state';

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
        this.assignments.assign(vendorId, subdomain).pipe(map((answer) => answered(vendorId, subdomain, answer))),
      ),
    ),
  );
}

// The api's answer to an assignment, as the state records it.
function answered(vendorId: string, subdomain: string, answer: AssignmentAnswer) {
  return answer === 'assigned'
    ? AssignSubdomainSuccess({ vendorId, subdomain })
    : AssignSubdomainRefused({ vendorId, refusal: answer });
}
