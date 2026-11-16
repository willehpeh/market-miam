import { Module } from '@nestjs/common';
import { Clock, DateClock } from '@market-miam/common';

@Module({
  providers: [{ provide: Clock, useClass: DateClock }],
  exports: [Clock],
})
export class ClockModule {}
