import { DomainEvent } from 'packages/event-sourcing/src';

export type MarketScheduleCancelled = DomainEvent<'MarketScheduleCancelled', {
  scheduleId: string;
}>;
