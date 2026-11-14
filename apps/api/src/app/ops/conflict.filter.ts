import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { SubdomainAlreadyAssignedError, SubdomainTakenError } from '@market-miam/market-days';
import { EmailInUseError } from './invitations';

// The operator's requests that conflict with what is there already: an address an account has
// (ADR 0060), a name assigned to another vendor, a vendor with a name (ADR 0065). 409, where
// the domain error filter would answer the subdomains' with 400.
@Catch(EmailInUseError, SubdomainTakenError, SubdomainAlreadyAssignedError)
export class ConflictFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost): void {
    host.switchToHttp().getResponse<Response>().status(HttpStatus.CONFLICT).json({
      statusCode: HttpStatus.CONFLICT,
      message: `${error.name} - ${error.message}`,
    });
  }
}
