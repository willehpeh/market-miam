import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';

export const AssignSubdomain = createAction('[Assignments] Assign Subdomain', props<{ vendorId: string; subdomain: string }>());
export const AssignSubdomainSuccess = createAction(
  '[Assignments] Assign Subdomain Success',
  props<{ vendorId: string; subdomain: string }>(),
);

export interface AssignmentState {
  // The vendor whose assignment the api has not answered yet.
  assigning: string | null;
}

export const initialState: AssignmentState = {
  assigning: null,
};

export const assignmentFeature = createFeature({
  name: 'assignment',
  reducer: createReducer<AssignmentState>(
    initialState,
    on(AssignSubdomain, (state, { vendorId }): AssignmentState => ({ ...state, assigning: vendorId })),
    on(AssignSubdomainSuccess, (state): AssignmentState => ({ ...state, assigning: null })),
  ),
});
