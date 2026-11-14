import { createAction, createFeature, createReducer, props } from '@ngrx/store';

export const AssignSubdomain = createAction('[Assignments] Assign Subdomain', props<{ vendorId: string; subdomain: string }>());

export type AssignmentState = object;

export const initialState: AssignmentState = {};

export const assignmentFeature = createFeature({
  name: 'assignment',
  reducer: createReducer<AssignmentState>(initialState),
});
