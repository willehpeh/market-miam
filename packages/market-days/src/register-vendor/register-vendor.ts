import { Command } from '@nestjs/cqrs';

export class RegisterVendor extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly registeredAt: string,
    readonly email: string,
  ) { super(); }
}
