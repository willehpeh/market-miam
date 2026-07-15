import { randomUUID } from 'node:crypto';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Lineage, LineageDispatcher } from '@market-miam/event-sourcing';
import { LineageMiddleware } from './lineage.middleware';

@Module({
  providers: [
    Lineage,
    {
      provide: LineageDispatcher,
      useFactory: (lineage: Lineage) =>
        new LineageDispatcher(lineage, () => randomUUID()),
      inject: [Lineage],
    },
    LineageMiddleware,
  ],
  exports: [Lineage, LineageDispatcher],
})
export class LineageModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LineageMiddleware).forRoutes('*');
  }
}
