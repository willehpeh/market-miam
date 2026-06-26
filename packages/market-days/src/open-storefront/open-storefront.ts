import { Command } from '@nestjs/cqrs';

export class OpenStorefront extends Command<void> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
