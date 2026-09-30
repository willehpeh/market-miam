import { createAction, props } from '@ngrx/store';
import { ItemOutcome, MarketDayView, UnratedMarketDay } from '../market-days';

export const LoadMarketDays = createAction('[Market Days] Load');
export const LoadMarketDaysSuccess = createAction('[Market Days] Load Success', props<{ days: MarketDayView[] }>());
export const LoadMarketDaysFailure = createAction('[Market Days] Load Failure', props<{ status: number }>());
// The live screen's own read (decision 58). Unlike the list it is never cached: the screen
// is entered once per market and the day it shows changes under the vendor all morning.
export const LoadMarketDay = createAction('[Market Days] Load Day', props<{ marketId: string; date: string }>());
export const LoadMarketDaySuccess = createAction('[Market Days] Load Day Success', props<{ day: MarketDayView }>());
// 404 and 5xx land in the same place — the screen's guard state — matching the list, whose
// failed load also leaves the screen with nothing to render. The interceptor surfaces 5xx.
export const LoadMarketDayFailure = createAction('[Market Days] Load Day Failure');
export const SetMarketDayMenu = createAction(
  '[Market Days] Set Menu',
  props<{ marketId: string; date: string; itemIds: string[] }>()
);
export const SetMarketDayMenuSuccess = createAction(
  '[Market Days] Set Menu Success',
  props<{ marketId: string; date: string; itemIds: string[] }>()
);
export const SetMarketDayMenuFailure = createAction('[Market Days] Set Menu Failure');
export const ChangeItemAvailability = createAction(
  '[Market Days] Change Item Availability',
  props<{ marketId: string; date: string; itemId: string; soldOut: boolean }>()
);
// Nothing to reduce on success — the patch landed on dispatch. The action exists so the
// queued effect has a completion to emit.
export const ChangeItemAvailabilitySuccess = createAction('[Market Days] Change Item Availability Success');
export const ChangeItemAvailabilityFailure = createAction(
  '[Market Days] Change Item Availability Failure',
  props<{ marketId: string; date: string; itemId: string; soldOut: boolean }>()
);
export const ChangeStandClosure = createAction(
  '[Market Days] Change Stand Closure',
  props<{ marketId: string; date: string; closed: boolean }>()
);
export const ChangeStandClosureSuccess = createAction('[Market Days] Change Stand Closure Success');
export const ChangeStandClosureFailure = createAction(
  '[Market Days] Change Stand Closure Failure',
  props<{ marketId: string; date: string; closed: boolean }>()
);
// The dashboard prompt's own read (decision 65). Never cached: it is asked for once per
// dashboard visit, and what it answers changes every time a bilan is recorded.
export const LoadUnratedMarketDays = createAction('[Market Days] Load Unrated');
export const LoadUnratedMarketDaysSuccess = createAction(
  '[Market Days] Load Unrated Success',
  props<{ marketDays: UnratedMarketDay[] }>()
);
// The prompt is a nudge, so a failed load leaves it silent rather than saying anything.
export const LoadUnratedMarketDaysFailure = createAction('[Market Days] Load Unrated Failure');
// The bilan, whole (decision 72). No optimistic patch: a whole-set save has nothing to
// show that the form is not already showing, and a failure leaves every answer standing.
// `complete` is the screen's own reading of its rows, not a count the reducer could make:
// the bilan has a row per menu item *that is still in the catalogue*, which is the same
// join the unrated query reads against, and a retired dish would make a count off the
// stored ids disagree with it.
export const RecordBilan = createAction(
  '[Market Days] Record Bilan',
  props<{ marketId: string; date: string; outcomes: Record<string, ItemOutcome>; complete: boolean }>()
);
export const RecordBilanSuccess = createAction(
  '[Market Days] Record Bilan Success',
  props<{ marketId: string; date: string; outcomes: Record<string, ItemOutcome>; complete: boolean }>()
);
export const RecordBilanFailure = createAction('[Market Days] Record Bilan Failure');
