import { Command } from '@nestjs/cqrs';

export class EditStorefrontInformation extends Command<void> {
  constructor(public readonly vendorId: string,
              public readonly name: string,
              public readonly description: string) {
    super();
  }
}
