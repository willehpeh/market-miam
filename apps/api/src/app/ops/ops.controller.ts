import { randomUUID } from 'node:crypto';
import { Body, ConflictException, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { CurrentOperator, OperatorAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedOperator } from '@market-miam/auth';
import { Clock } from '@market-miam/common';
import { CommandGateway } from '@market-miam/event-sourcing';
import { InviteVendor, SubdomainRegistry } from '@market-miam/market-days';
import { Accounts } from './accounts/accounts';
import { accountList, AccountListing } from './account-list';
import { shapeOf } from '../shape-of.pipe';
import { OperatorLineageInterceptor } from './operator-lineage.interceptor';

// Shape only (ADR 0046): what an email must be is the Email value object's to say.
const InvitationBody = z.object({ email: z.string() });

// The operator surface: everything the admin app calls lives under ops/, behind the
// operator guard on the class (never per route — see OperatorAuthGuard), and with the
// operator on its lineage, so whatever a route records names who asked for it.
@Controller('ops')
@UseGuards(OperatorAuthGuard)
@UseInterceptors(OperatorLineageInterceptor)
export class OpsController {
  constructor(
    private readonly accounts: Accounts,
    private readonly subdomains: SubdomainRegistry,
    private readonly commands: CommandGateway,
    private readonly clock: Clock,
  ) {}

  @Get('whoami')
  whoami(@CurrentOperator() operator: VerifiedOperator): { operatorId: string } {
    return { operatorId: operator.operatorId };
  }

  @Get('accounts')
  async accountList(): Promise<AccountListing[]> {
    const [accounts, assignments] = await Promise.all([this.accounts.all(), this.subdomains.assignments()]);
    return accountList(accounts, assignments);
  }

  // Accepted, not created: the account opens when the processor has run (ADR 0060).
  @Post('vendors')
  @HttpCode(HttpStatus.ACCEPTED)
  async invite(@Body(shapeOf(InvitationBody)) body: z.infer<typeof InvitationBody>): Promise<{ vendorId: string }> {
    // Auth0 keeps addresses in lower case, so the check and the invitation do too.
    const email = body.email.toLowerCase();
    if (await this.isHeld(email)) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        message: 'EmailInUse - an account already holds this address',
      });
    }
    const vendorId = randomUUID();
    await this.commands.execute(new InviteVendor(vendorId, this.clock.now().value(), email));
    return { vendorId };
  }

  // Any account, whatever its connection: vendors sign in only by email, operators only
  // through GitHub (ADR 0060).
  private async isHeld(email: string): Promise<boolean> {
    return (await this.accounts.all()).some((account) => account.email === email);
  }
}
