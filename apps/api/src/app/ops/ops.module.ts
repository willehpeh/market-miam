import { Module } from '@nestjs/common';
import { Clock, DateClock } from '@market-miam/common';
import { LineageModule } from '../lineage/lineage.module';
import { OpsController } from './ops.controller';
import { Invitations } from './invitations';

// Accounts come from the profile's accounts module (Auth0, or development's stand-in).
@Module({
  imports: [LineageModule],
  controllers: [OpsController],
  providers: [{ provide: Clock, useClass: DateClock }, Invitations],
})
export class OpsModule {}
