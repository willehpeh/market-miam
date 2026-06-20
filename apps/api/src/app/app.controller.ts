import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentVendor, JwtAuthGuard } from '@market-monster/auth-nestjs';
import { VerifiedVendor } from '@market-monster/auth';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentVendor() vendor: VerifiedVendor) {
    return { vendorId: vendor.vendorId.value() };
  }
}
