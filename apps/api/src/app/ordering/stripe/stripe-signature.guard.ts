import { BadRequestException, CanActivate, ExecutionContext, Inject, Injectable, RawBodyRequest, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { StripeEventDestination } from './stripe-event-destination';

export type StripeDestinationName = 'accounts' | 'payments';

export const STRIPE_EVENT_DESTINATIONS = Symbol('StripeEventDestinations');

const DESTINATION = 'stripe-destination';

export const DeliveredTo = (destination: StripeDestinationName) => SetMetadata(DESTINATION, destination);

@Injectable()
export class StripeSignatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(STRIPE_EVENT_DESTINATIONS) private readonly destinations: Record<StripeDestinationName, StripeEventDestination>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const destination = this.destinations[this.reflector.get<StripeDestinationName>(DESTINATION, context.getHandler())];
    if (!destination.isGenuine(request.rawBody ?? Buffer.alloc(0), request.header('stripe-signature'))) {
      throw new BadRequestException('Not a genuine Stripe event');
    }
    return true;
  }
}
