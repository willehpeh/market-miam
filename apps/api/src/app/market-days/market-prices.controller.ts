import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway } from '@market-miam/event-sourcing';
import { SetMarketPrices } from '@market-miam/market-days';
import { shapeOf } from '../shape-of.pipe';

// Either shape a dish can be priced in, gated at the edge (ADR 0046) so a string where
// cents belong is a 400 rather than something the domain has to phrase an answer for.
const PricesBody = z.object({
  prices: z.record(z.string(), z.union([z.number(), z.record(z.string(), z.number())])),
});

// Prices belong to a market — not to a schedule, since two can sit at one market, and not
// to a market day. So they get their own resource, for the same reason market days did
// rather than hanging off /market-schedules.
@Controller('market-prices')
export class MarketPricesController {
  constructor(private readonly commands: CommandGateway) {}

  // The whole list every time, like the menu: clearing a market is an empty `prices`
  // rather than a DELETE, and what the list does not name sells at the catalogue price.
  @Put(':marketId')
  @UseGuards(JwtAuthGuard)
  async setPrices(
    @CurrentVendor() vendor: VerifiedVendor,
    @Param('marketId') marketId: string,
    @Body(shapeOf(PricesBody)) body: z.infer<typeof PricesBody>,
  ): Promise<void> {
    await this.commands.execute(
      new SetMarketPrices({ vendorId: vendor.vendorId.value(), marketId, prices: body.prices }),
    );
  }
}
