import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Assignments } from './assignments';
import { HttpAssignments } from './http.assignments';
import { assignmentFeature } from './assignment.state';
import { AssignmentEffects } from './assignment.effects';
import { AssignmentFacade } from './assignment.facade';
import { StoreAssignmentFacade } from './store.assignment.facade';

export function provideAssignments(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Assignments, useClass: HttpAssignments },
    provideState(assignmentFeature),
    provideEffects(AssignmentEffects),
    { provide: AssignmentFacade, useClass: StoreAssignmentFacade },
  ]);
}
