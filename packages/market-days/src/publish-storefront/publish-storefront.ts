import { Command } from '@nestjs/cqrs';

export class PublishStorefront extends Command<void> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
