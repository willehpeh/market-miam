import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { QueryGateway } from '@market-miam/event-sourcing';
import { CustomerStorefront, FindCustomerStorefront } from '@market-miam/market-days';

@Controller('public/storefront')
export class PublicStorefrontController {
  constructor(private readonly queries: QueryGateway) {}

  @Get(':subdomain')
  async view(@Param('subdomain') subdomain: string): Promise<CustomerStorefront> {
    const storefront = await this.queries.execute(new FindCustomerStorefront(subdomain));
    if (!storefront) throw new NotFoundException();
    return storefront;
  }
}
