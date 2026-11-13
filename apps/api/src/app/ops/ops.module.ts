import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller';

// Accounts come from the profile's accounts module (Auth0, or development's stand-in).
@Module({
  controllers: [OpsController],
})
export class OpsModule {}
