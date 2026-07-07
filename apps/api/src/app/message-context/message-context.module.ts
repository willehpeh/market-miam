import { randomUUID } from 'node:crypto';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MessageContext, MessageContextDispatcher } from '@market-miam/event-sourcing';
import { MessageContextMiddleware } from './message-context.middleware';

@Module({
  providers: [
    MessageContext,
    {
      provide: MessageContextDispatcher,
      useFactory: (context: MessageContext) =>
        new MessageContextDispatcher(context, () => randomUUID()),
      inject: [MessageContext],
    },
    MessageContextMiddleware,
  ],
  exports: [MessageContext, MessageContextDispatcher],
})
export class MessageContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MessageContextMiddleware).forRoutes('*');
  }
}
