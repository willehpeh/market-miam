import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentOperator, OperatorAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedOperator } from '@market-miam/auth';

// The operator surface: everything the admin app calls lives under ops/, behind the
// operator guard on the class (never per route — see OperatorAuthGuard).
@Controller('ops')
@UseGuards(OperatorAuthGuard)
export class OpsController {
  @Get('whoami')
  whoami(@CurrentOperator() operator: VerifiedOperator): { operatorId: string } {
    return { operatorId: operator.operatorId };
  }
}
