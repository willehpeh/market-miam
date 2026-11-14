import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { RefusedAssignment } from './assignments';

export const AssignSubdomain = createAction('[Assignments] Assign Subdomain', props<{ vendorId: string; subdomain: string }>());
export const AssignSubdomainSuccess = createAction(
  '[Assignments] Assign Subdomain Success',
  props<{ vendorId: string; subdomain: string }>(),
);
export const AssignSubdomainRefused = createAction(
  '[Assignments] Assign Subdomain Refused',
  props<RefusedAssignment>(),
);

export interface AssignmentState {
  // The vendor whose assignment the api has not answered yet.
  assigning: string | null;
  // Whose last assignment did not go, and why, until the next one starts.
  refused: RefusedAssignment | null;
}

export const initialState: AssignmentState = {
  assigning: null,
  refused: null,
};

export const assignmentFeature = createFeature({
  name: 'assignment',
  reducer: createReducer<AssignmentState>(
    initialState,
    on(AssignSubdomain, (state, { vendorId }): AssignmentState => ({ ...state, assigning: vendorId, refused: null })),
    on(AssignSubdomainSuccess, (state): AssignmentState => ({ ...state, assigning: null })),
    on(AssignSubdomainRefused, (state, { vendorId, refusal }): AssignmentState => ({
      ...state,
      assigning: null,
      refused: { vendorId, refusal },
    })),
  ),
});
