import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { QueryGateway } from '@market-miam/event-sourcing';
import { FindSellingRecord, SellingRecordView } from '@market-miam/market-days';

// Its own resource rather than a segment under /market-days: what it answers is not a market
// day but what several of them said together, and prices took /market-prices on the same
// reasoning rather than hanging off /market-schedules.
//
// No zod pipe, unlike the writes: there is no body and no parameter to gate, and the vendor
// comes from the token (ADR 0046 gates request shape, and this request has none).
@Controller('selling-record')
export class SellingRecordController {
  constructor(private readonly queries: QueryGateway) {}

  // The vendor's whole set in one read, sliced by whichever surface asked (decision 3).
  @Get()
  @UseGuards(JwtAuthGuard)
  record(@CurrentVendor() vendor: VerifiedVendor): Promise<SellingRecordView> {
    return this.queries.execute(new FindSellingRecord(vendor.vendorId.value()));
  }
}
