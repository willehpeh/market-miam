import { MarketScheduleRegistered } from './market-schedule-registered';
import { MarketScheduleCancelled } from './market-schedule-cancelled';

export type CalendarEvent = MarketScheduleRegistered | MarketScheduleCancelled;
