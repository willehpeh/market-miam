import { Query } from '@nestjs/cqrs';

export class IsStorefrontPublished extends Query<boolean> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
