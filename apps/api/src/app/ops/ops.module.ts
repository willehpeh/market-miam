import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpsController } from './ops.controller';
import { Accounts } from './accounts/accounts';
import { accountsFor } from './accounts/accounts.factory';

@Module({
  controllers: [OpsController],
  providers: [{ provide: Accounts, useFactory: accountsFor, inject: [ConfigService] }],
})
export class OpsModule {}
