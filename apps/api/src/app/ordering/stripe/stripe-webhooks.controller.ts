import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CommandGateway } from '@market-miam/event-sourcing';
import { DetectPaymentAccountUpdate } from '@market-miam/ordering';
import { shapeOf } from '../../shape-of.pipe';
import { StripeSignatureGuard } from './stripe-signature.guard';

const AccountEvent = z.object({ id: z.string(), related_object: z.object({ id: z.string() }) });

@Controller('webhooks/stripe')
@UseGuards(StripeSignatureGuard)
export class StripeWebhooksController {
  constructor(private readonly commands: CommandGateway) {}

  @Post('accounts')
  @HttpCode(HttpStatus.OK)
  async accountEvent(@Body(shapeOf(AccountEvent)) event: z.infer<typeof AccountEvent>): Promise<void> {
    await this.commands.execute(new DetectPaymentAccountUpdate(event.id, event.related_object.id));
  }
}
