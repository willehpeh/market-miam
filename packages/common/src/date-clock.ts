import { Clock, LocalDate } from './local-date';
import { Instant } from './instant';

/**
 * The real system clock. Reads `today` and `now` from the host's wall clock.
 * Reference implementation of the {@link Clock} port; swap for a fixed clock
 * in tests for deterministic time.
 */
export class DateClock extends Clock {
  today(): LocalDate {
    return LocalDate.today();
  }

  now(): Instant {
    return new Instant(new Date().toISOString());
  }
}
