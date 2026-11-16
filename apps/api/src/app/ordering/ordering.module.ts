import { Module } from '@nestjs/common';
import { Clock } from '@market-miam/common';
import { CommandGateway } from '@market-miam/event-sourcing';
import {
  CreatesPaymentAccounts,
  FailPaymentAccountRegistrationHandler,
  InMemoryPaymentAccounts,
  Merchants,
  PaymentAccounts,
  PublishedStorefronts,
  StartPaymentAccountRegistrationHandler,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { ClockModule } from '../clock.module';
import { MarketDaysPublishedStorefronts } from './market-days-published-storefronts';
import { PaymentAccountController } from './payment-account.controller';

@Module({
  imports: [ClockModule],
  controllers: [PaymentAccountController],
  providers: [
    { provide: Merchants, useFactory: (events: VendorScopedEvents) => new Merchants(events), inject: [VendorScopedEvents] },
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
  ],
})
export class OrderingModule {}
