import { Command } from '@nestjs/cqrs';

export class InviteVendor extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly invitedAt: string,
    readonly email: string,
  ) { super(); }
}
