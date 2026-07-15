import { Query } from '@nestjs/cqrs';
import { CustomerStorefront } from './customer-storefront';

export class FindCustomerStorefront extends Query<CustomerStorefront | undefined> {
  constructor(public readonly subdomain: string) {
    super();
  }
}
