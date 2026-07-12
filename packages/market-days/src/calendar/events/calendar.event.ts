import { MarketScheduleRegistered } from './market-schedule-registered';
import { MarketScheduleCancelled } from './market-schedule-cancelled';
import { MarketScheduleAmended } from './market-schedule-amended';
import { AbsenceDeclared } from './absence-declared';

export type CalendarEvent = MarketScheduleRegistered | MarketScheduleCancelled | MarketScheduleAmended | AbsenceDeclared;
