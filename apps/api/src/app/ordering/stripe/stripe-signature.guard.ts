import { BadRequestException, CanActivate, ExecutionContext, Injectable, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { StripeEventDestination } from './stripe-event-destination';

@Injectable()
export class StripeSignatureGuard implements CanActivate {
  constructor(private readonly destination: StripeEventDestination) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    if (!this.destination.isGenuine(request.rawBody ?? Buffer.alloc(0), request.header('stripe-signature'))) {
      throw new BadRequestException('Not a genuine Stripe event');
    }
    return true;
  }
}
