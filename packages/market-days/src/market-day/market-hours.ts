import { LocalTime } from '@market-miam/common';

// The hours a market day runs. A schedule may leave either out, and the fallbacks below
// are a comparison rule rather than a value — a day with no hours still renders as having
// none — so they live here instead of in a constructor that normalises (decision 62).
export class MarketHours {

  constructor(private readonly _startTime?: string,
              private readonly _endTime?: string) {
  }

  // No startTime counts as the start of the calendar day, no endTime as its end.
  opening(): LocalTime {
    return new LocalTime(this._startTime || '00:00');
  }

  closing(): LocalTime {
    return new LocalTime(this._endTime || '23:59');
  }
}
