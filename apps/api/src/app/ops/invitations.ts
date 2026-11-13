import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Clock, SignInAddress } from '@market-miam/common';
import { CommandGateway } from '@market-miam/event-sourcing';
import { InviteVendor } from '@market-miam/market-days';
import { Accounts } from './accounts/accounts';

export class EmailInUseError extends Error {
  constructor() {
    super('An account already holds this address');
  }
}

// Inviting a vendor (ADR 0060). An address an account already holds is refused here, so only
// two invitations racing in the seconds before an account opens reach the processor's email-in-use.
@Injectable()
export class Invitations {
  constructor(
    private readonly accounts: Accounts,
    private readonly commands: CommandGateway,
    private readonly clock: Clock,
  ) {}

  // The vendorId minted for whoever will sign in at this address.
  async send(email: string): Promise<string> {
    const address = new SignInAddress(email);
    if (await this.accounts.contains(address)) {
      throw new EmailInUseError();
    }
    const vendorId = randomUUID();
    await this.commands.execute(new InviteVendor(vendorId, this.clock.now().value(), address.value()));
    return vendorId;
  }
}
