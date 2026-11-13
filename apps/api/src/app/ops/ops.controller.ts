import { Body, ConflictException, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { CurrentOperator, OperatorAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedOperator } from '@market-miam/auth';
import { SubdomainRegistry } from '@market-miam/market-days';
import { Accounts } from './accounts/accounts';
import { accountList, AccountListing } from './account-list';
import { shapeOf } from '../shape-of.pipe';
import { OperatorLineageInterceptor } from './operator-lineage.interceptor';
import { EmailInUseError, Invitations } from './invitations';

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
    private readonly invitations: Invitations,
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
  async invite(@Body(shapeOf(InvitationBody)) { email }: z.infer<typeof InvitationBody>): Promise<{ vendorId: string }> {
    try {
      return { vendorId: await this.invitations.send(email) };
    } catch (error) {
      if (error instanceof EmailInUseError) {
        throw new ConflictException({ statusCode: HttpStatus.CONFLICT, message: `EmailInUse - ${error.message}` });
      }
      throw error;
    }
  }
}
