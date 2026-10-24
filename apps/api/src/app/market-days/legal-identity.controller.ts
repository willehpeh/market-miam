import { Body, Controller, Get, NotFoundException, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway, QueryGateway } from '@market-miam/event-sourcing';
import { FindVendorLegalIdentity, ProvideVendorLegalIdentity } from '@market-miam/market-days';
import { shapeOf } from '../shape-of.pipe';

// Shape only (ADR 0046): what a SIRET, a TVA regime or a médiateur pair must be is the
// value objects' to say.
const LegalIdentityBody = z.object({
  siret: z.string(),
  legalName: z.string(),
  address: z.string(),
  contactEmail: z.string(),
  phone: z.string(),
  vatRegime: z.string(),
  mediatorName: z.string().nullable(),
  mediatorUrl: z.string().nullable(),
  legalForm: z.string().nullable(),
  shareCapital: z.string().nullable(),
  registryCity: z.string().nullable(),
  legalRepresentative: z.string().nullable(),
});

type LegalIdentity = z.infer<typeof LegalIdentityBody>;

@Controller('legal-identity')
export class LegalIdentityController {
  constructor(
    private readonly commands: CommandGateway,
    private readonly queries: QueryGateway,
  ) {}

  // What the vendor typed, for their form: SIREN and TVA number are derived, never edited.
  @Get()
  @UseGuards(JwtAuthGuard)
  async view(@CurrentVendor() vendor: VerifiedVendor): Promise<LegalIdentity> {
    const view = await this.queries.execute(new FindVendorLegalIdentity(vendor.vendorId.value()));
    if (!view) throw new NotFoundException();
    const { siren: _siren, vatNumber: _vatNumber, ...provided } = view;
    return provided;
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async provide(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body(shapeOf(LegalIdentityBody)) body: LegalIdentity,
  ): Promise<void> {
    await this.commands.execute(
      new ProvideVendorLegalIdentity(
        vendor.vendorId.value(),
        body.siret,
        body.legalName,
        body.address,
        body.contactEmail,
        body.phone,
        body.vatRegime,
        body.mediatorName,
        body.mediatorUrl,
        body.legalForm,
        body.shareCapital,
        body.registryCity,
        body.legalRepresentative,
      ),
    );
  }
}
