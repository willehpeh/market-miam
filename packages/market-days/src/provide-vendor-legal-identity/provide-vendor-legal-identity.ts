import { Command } from '@nestjs/cqrs';

export class ProvideVendorLegalIdentity extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly siret: string,
    readonly legalName: string,
    readonly address: string,
    readonly contactEmail: string,
    readonly phone: string,
    readonly vatRegime: string,
    readonly mediatorName: string | null,
    readonly mediatorUrl: string | null,
    readonly legalForm: string | null,
    readonly shareCapital: string | null,
    readonly registryCity: string | null,
    readonly legalRepresentative: string | null,
  ) { super(); }
}
