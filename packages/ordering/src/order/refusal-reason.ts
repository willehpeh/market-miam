import { Availability } from './availability';

export type RefusalReason = Exclude<Availability, 'available'>;
