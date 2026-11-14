import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { OperatorAuthGuard } from '@market-miam/auth-nestjs';
import { Clock } from '@market-miam/common';
import { CommandGateway } from '@market-miam/event-sourcing';
import { AssignSubdomain, EraseVendor, SubdomainRegistry } from '@market-miam/market-days';
import { Accounts } from './accounts/accounts';
import { accountList, AccountListing } from './account-list';
import { shapeOf } from '../shape-of.pipe';
import { OperatorLineageInterceptor } from './operator-lineage.interceptor';
import { Invitations } from './invitations';
import { ConflictFilter } from './conflict.filter';

// Shape only (ADR 0046): what an email must be is the Email value object's to say.
const InvitationBody = z.object({ email: z.string() });
// What a subdomain may be is the Subdomain value object's to say (ADR 0065).
const SubdomainBody = z.object({ subdomain: z.string() });

// The operator surface: everything the admin app calls lives under ops/, behind the
// operator guard on the class (never per route — see OperatorAuthGuard), and with the
// operator on its lineage, so whatever a route records names who asked for it.
@Controller('ops')
@UseGuards(OperatorAuthGuard)
@UseInterceptors(OperatorLineageInterceptor)
@UseFilters(ConflictFilter)
export class OpsController {
  constructor(
    private readonly accounts: Accounts,
    private readonly subdomains: SubdomainRegistry,
    private readonly invitations: Invitations,
    private readonly commands: CommandGateway,
    private readonly clock: Clock,
  ) {}

  @Get('accounts')
  async accountList(): Promise<AccountListing[]> {
    const [accounts, assignments] = await Promise.all([this.accounts.all(), this.subdomains.assignments()]);
    return accountList(accounts, assignments);
  }

  // Accepted, not created: the account opens when the processor has run (ADR 0060).
  @Post('vendors')
  @HttpCode(HttpStatus.ACCEPTED)
  async invite(@Body(shapeOf(InvitationBody)) { email }: z.infer<typeof InvitationBody>): Promise<{ vendorId: string }> {
    return { vendorId: await this.invitations.send(email) };
  }

  // Claimed and recorded together, in one transaction (ADR 0065).
  @Put('vendors/:vendorId/subdomain')
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignSubdomain(
    @Param('vendorId') vendorId: string,
    @Body(shapeOf(SubdomainBody)) { subdomain }: z.infer<typeof SubdomainBody>,
  ): Promise<void> {
    await this.commands.execute(new AssignSubdomain(vendorId, subdomain, this.clock.now().value()));
  }

  // Accepted, not done: the processors carry the erasure out (ADR 0058, 0063).
  @Post('vendors/:vendorId/erasure')
  @HttpCode(HttpStatus.ACCEPTED)
  async erase(@Param('vendorId') vendorId: string): Promise<void> {
    await this.commands.execute(new EraseVendor(vendorId, this.clock.now().value()));
  }
}
