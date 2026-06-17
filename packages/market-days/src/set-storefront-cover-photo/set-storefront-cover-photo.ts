import { Command } from '@nestjs/cqrs';

export class SetStorefrontCoverPhoto extends Command<void> {
  constructor(public readonly vendorId: string,
              public readonly imageReference: string) {
    super();
  }
}
