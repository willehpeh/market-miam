import { Module } from '@nestjs/common';
import { Clock, DateClock } from '@market-miam/common';
import { OpsController } from './ops.controller';

// Accounts come from the profile's accounts module (Auth0, or development's stand-in).
@Module({
  controllers: [OpsController],
  providers: [{ provide: Clock, useClass: DateClock }],
})
export class OpsModule {}
