import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CommandGateway } from '@market-miam/event-sourcing';
import { StartCheckout } from '@market-miam/ordering';
import { shapeOf } from '../shape-of.pipe';

const CheckoutRequest = z.object({
  marketId: z.string(),
  basket: z.array(z.object({ dishId: z.string(), variant: z.string().optional(), quantity: z.number() })),
});

@Controller('public/storefront')
export class CheckoutController {
  constructor(private readonly commands: CommandGateway) {}

  @Post(':subdomain/checkout')
  @HttpCode(HttpStatus.OK)
  async start(
    @Param('subdomain') subdomain: string,
    @Body(shapeOf(CheckoutRequest)) { marketId, basket }: z.infer<typeof CheckoutRequest>,
  ): Promise<{ url: string }> {
    return { url: await this.commands.execute(new StartCheckout(subdomain, marketId, basket)) };
  }
}
