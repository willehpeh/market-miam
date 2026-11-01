import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentOperator, OperatorAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedOperator } from '@market-miam/auth';
import { SubdomainRegistry } from '@market-miam/market-days';
import { Accounts } from './accounts/accounts';
import { accountList, AccountListing } from './account-list';

// The operator surface: everything the admin app calls lives under ops/, behind the
// operator guard on the class (never per route — see OperatorAuthGuard).
@Controller('ops')
@UseGuards(OperatorAuthGuard)
export class OpsController {
  constructor(
    private readonly accounts: Accounts,
    private readonly subdomains: SubdomainRegistry,
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
}
