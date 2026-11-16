import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { Clock } from '@market-miam/common';
import { CommandGateway } from '@market-miam/event-sourcing';
import { StartPaymentAccountRegistration } from '@market-miam/ordering';
import { shapeOf } from '../shape-of.pipe';

const RegistrationBody = z.object({ registrationId: z.string(), accountToken: z.string() });

@Controller('payment-account')
export class PaymentAccountController {
  constructor(
    private readonly commands: CommandGateway,
    private readonly clock: Clock,
  ) {}

  @Post('registrations')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard)
  async startRegistration(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body(shapeOf(RegistrationBody)) { registrationId, accountToken }: z.infer<typeof RegistrationBody>,
  ): Promise<void> {
    await this.commands.execute(
      new StartPaymentAccountRegistration(vendor.vendorId.value(), registrationId, accountToken, this.clock.now().value()),
    );
  }
}
