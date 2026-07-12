import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { MarketScheduleFacade } from './market-schedule.facade';

// The edit route reuses the add form, which reads its schedule synchronously at
// construction. On a cold direct-nav the store is empty, so warm it (only when cold, to
// preserve an optimistic insert) and hold the route until the load settles. A schedule
// that still isn't there is a stale link — bounce to the calendar.
export const editableSchedule: CanActivateFn = (route) => {
  const markets = inject(MarketScheduleFacade);
  const router = inject(Router);
  if (markets.schedules().length === 0) {
    markets.load();
  }
  return toObservable(markets.loading).pipe(
    filter((loading) => !loading),
    take(1),
    map(() =>
      markets.schedules().some((schedule) => schedule.scheduleId === route.paramMap.get('scheduleId'))
        ? true
        : router.parseUrl('/dashboard/markets'),
    ),
  );
};
