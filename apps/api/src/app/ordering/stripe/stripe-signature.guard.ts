import { BadRequestException, CanActivate, ExecutionContext, Inject, Injectable, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { StripeEventDestination } from './stripe-event-destination';

export const STRIPE_EVENT_DESTINATIONS = Symbol('StripeEventDestinations');

@Injectable()
export class StripeSignatureGuard implements CanActivate {
  constructor(@Inject(STRIPE_EVENT_DESTINATIONS) private readonly destinations: StripeEventDestination[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const body = request.rawBody ?? Buffer.alloc(0);
    if (!this.destinations.some(destination => destination.isGenuine(body, request.header('stripe-signature')))) {
      throw new BadRequestException('Not a genuine Stripe event');
    }
    return true;
  }
}
