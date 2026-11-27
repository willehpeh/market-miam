import { Query } from '@nestjs/cqrs';

export class FindVendorPublishingAt extends Query<string | undefined> {
  constructor(public readonly subdomain: string) {
    super();
  }
}
