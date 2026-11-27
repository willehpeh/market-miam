import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Clock } from '@market-miam/common';
import { CommandGateway, EventStore } from '@market-miam/event-sourcing';
import {
  ChecksPaymentAccounts,
  CreatesPaymentAccounts,
  ObservePaymentAccountHandler,
  DetectPaymentAccountUpdateHandler,
  FailPaymentAccountRegistrationHandler,
  InMemoryPaymentAccounts,
  InMemoryPayments,
  Merchants,
  Orders,
  PaymentAccountNotices,
  PaymentAccounts,
  Payments,
  PlaceOrderHandler,
  PublishedStorefronts,
  StartCheckoutHandler,
  StartPaymentAccountRegistrationHandler,
  TradingDays,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { ClockModule } from '../clock.module';
import { MarketDaysPublishedStorefronts } from './market-days-published-storefronts';
import { MarketDaysTradingDays } from './market-days-trading-days';
import { PaymentAccountController } from './payment-account.controller';
import { CheckoutController } from './checkout.controller';
import { SigningSecret } from './stripe/signing-secret';
import { StripeEventDestination } from './stripe/stripe-event-destination';
import { STRIPE_EVENT_DESTINATIONS } from './stripe/stripe-signature.guard';
import { StripeWebhooksController } from './stripe/stripe-webhooks.controller';

@Module({
  imports: [ClockModule],
  controllers: [PaymentAccountController, StripeWebhooksController, CheckoutController],
  providers: [
    { provide: Merchants, useFactory: (events: VendorScopedEvents) => new Merchants(events), inject: [VendorScopedEvents] },
    {
      provide: STRIPE_EVENT_DESTINATIONS,
      useFactory: (config: ConfigService, clock: Clock) => {
        const destination = (secret: string) => new StripeEventDestination(new SigningSecret(config.getOrThrow<string>(secret)), clock);
        return { accounts: destination('STRIPE_ACCOUNTS_WEBHOOK_SECRET'), payments: destination('STRIPE_PAYMENTS_WEBHOOK_SECRET') };
      },
      inject: [ConfigService, Clock],
    },
    { provide: Orders, useFactory: (events: VendorScopedEvents) => new Orders(events), inject: [VendorScopedEvents] },
    { provide: PaymentAccountNotices, useFactory: (store: EventStore) => new PaymentAccountNotices(store), inject: [EventStore] },
    { provide: PublishedStorefronts, useClass: MarketDaysPublishedStorefronts },
    { provide: PaymentAccounts, useClass: InMemoryPaymentAccounts },
    { provide: Payments, useClass: InMemoryPayments },
    { provide: TradingDays, useClass: MarketDaysTradingDays },
    {
      provide: CreatesPaymentAccounts,
      useFactory: (accounts: PaymentAccounts, commands: CommandGateway, clock: Clock) =>
        new CreatesPaymentAccounts(accounts, commands, clock),
      inject: [PaymentAccounts, CommandGateway, Clock],
    },
    {
      provide: ChecksPaymentAccounts,
      useFactory: (accounts: PaymentAccounts, commands: CommandGateway, clock: Clock) =>
        new ChecksPaymentAccounts(accounts, commands, clock),
      inject: [PaymentAccounts, CommandGateway, Clock],
    },
    StartPaymentAccountRegistrationHandler,
    FailPaymentAccountRegistrationHandler,
    ObservePaymentAccountHandler,
    DetectPaymentAccountUpdateHandler,
    PlaceOrderHandler,
    StartCheckoutHandler,
  ],
})
export class OrderingModule {}
