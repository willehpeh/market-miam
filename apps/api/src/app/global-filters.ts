import { APP_FILTER } from '@nestjs/core';
import { ConcurrencyErrorFilter } from './concurrency-error.filter';
import { DomainErrorFilter } from './domain-error.filter';

// One list, two consumers: AppModule and the api test module. Registered separately, a
// filter added to only the test module passes the whole suite while production still
// answers 500 — nothing boots AppModule in a test, so nothing would notice.
export const globalFilters = [
  { provide: APP_FILTER, useClass: DomainErrorFilter },
  { provide: APP_FILTER, useClass: ConcurrencyErrorFilter },
];
