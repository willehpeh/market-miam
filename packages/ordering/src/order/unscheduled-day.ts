import { Availability } from './availability';

export class UnscheduledDay {
  availabilityOf(): Availability {
    return 'closed';
  }
}
