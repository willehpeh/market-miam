import { MarketScheduleRegistered } from './market-schedule-registered';
import { MarketScheduleCancelled } from './market-schedule-cancelled';
import { MarketScheduleAmended } from './market-schedule-amended';
import { AbsenceDeclared } from './absence-declared';
import { MarketPricesSet } from './market-prices-set';

// The schedule half on its own, because the market-schedule view projects only these and
// `EventHandlerMap` is total over the union it is given — folding prices into that union
// would force the projection to declare a handler it has no use for.
export type ScheduleEvent = MarketScheduleRegistered | MarketScheduleCancelled | MarketScheduleAmended | AbsenceDeclared;

export type CalendarEvent = ScheduleEvent | MarketPricesSet;
