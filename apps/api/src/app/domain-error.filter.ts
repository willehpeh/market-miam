import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '@market-miam/common';

// Domain value objects validate in their constructors and throw a DomainError on
// bad input. Without this, that surfaces as a 500; here it becomes a 400.
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    host.switchToHttp().getResponse<Response>().status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: error.message,
    });
  }
}
