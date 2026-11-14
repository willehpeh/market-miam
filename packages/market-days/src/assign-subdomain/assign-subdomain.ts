import { Command } from '@nestjs/cqrs';

export class AssignSubdomain extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly subdomain: string,
    readonly assignedAt: string,
  ) { super(); }
}
