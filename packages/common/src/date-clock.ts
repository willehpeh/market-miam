import { Clock, LocalDate } from './local-date';
import { Instant } from './instant';

/**
 * The real system clock. Reads `today` and `now` from the host's wall clock.
 * Reference implementation of the {@link Clock} port; swap for a fixed clock
 * in tests for deterministic time.
 */
export class DateClock extends Clock {
  today(): LocalDate {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return new LocalDate(`${year}-${month}-${day}`);
  }

  now(): Instant {
    return new Instant(new Date().toISOString());
  }
}
