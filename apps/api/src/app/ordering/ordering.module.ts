import { Module } from '@nestjs/common';
import { Clock } from '@market-miam/common';
import { CommandGateway, EventStore } from '@market-miam/event-sourcing';
import {
  CreatesPaymentAccounts,
  DetectPaymentAccountUpdateHandler,
  FailPaymentAccountRegistrationHandler,
  InMemoryPaymentAccounts,
  Merchants,
  PaymentAccountNotices,
  PaymentAccounts,
  PublishedStorefronts,
  StartPaymentAccountRegistrationHandler,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { ClockModule } from '../clock.module';
import { MarketDaysPublishedStorefronts } from './market-days-published-storefronts';
import { PaymentAccountController } from './payment-account.controller';
import { StripeWebhooksController } from './stripe/stripe-webhooks.controller';

@Module({
  imports: [ClockModule],
  controllers: [PaymentAccountController, StripeWebhooksController],
  providers: [
    { provide: Merchants, useFactory: (events: VendorScopedEvents) => new Merchants(events), inject: [VendorScopedEvents] },
    { provide: PaymentAccountNotices, useFactory: (store: EventStore) => new PaymentAccountNotices(store), inject: [EventStore] },
    { provide: PublishedStorefronts, useClass: MarketDaysPublishedStorefronts },
    { provide: PaymentAccounts, useClass: InMemoryPaymentAccounts },
    {
      provide: CreatesPaymentAccounts,
      useFactory: (accounts: PaymentAccounts, commands: CommandGateway, clock: Clock) =>
        new CreatesPaymentAccounts(accounts, commands, clock),
      inject: [PaymentAccounts, CommandGateway, Clock],
    },
    StartPaymentAccountRegistrationHandler,
    FailPaymentAccountRegistrationHandler,
    DetectPaymentAccountUpdateHandler,
  ],
})
export class OrderingModule {}
