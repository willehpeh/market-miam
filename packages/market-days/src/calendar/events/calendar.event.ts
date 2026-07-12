import { MarketScheduleRegistered } from './market-schedule-registered';
import { MarketScheduleCancelled } from './market-schedule-cancelled';
import { AbsenceDeclared } from './absence-declared';

export type CalendarEvent = MarketScheduleRegistered | MarketScheduleCancelled | AbsenceDeclared;
