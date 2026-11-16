import { Module } from '@nestjs/common';
import { ClockModule } from '../clock.module';
import { LineageModule } from '../lineage/lineage.module';
import { OpsController } from './ops.controller';
import { Invitations } from './invitations';

// Accounts come from the profile's accounts module (Auth0, or development's stand-in).
@Module({
  imports: [LineageModule, ClockModule],
  controllers: [OpsController],
  providers: [Invitations],
})
export class OpsModule {}
