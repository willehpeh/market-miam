import { DomainEvent } from 'packages/event-sourcing/src';

export type AbsenceDeclared = DomainEvent<'AbsenceDeclared', {
  scheduleId: string;
  from: string;
  to: string;
}>;
