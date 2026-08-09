import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ConcurrencyError } from '@market-miam/event-sourcing';

// A lost append is a race the caller can resolve by retrying, not a server fault. Left
// unhandled it arrives as a 500, which makes every double-submit look like an incident to
// anything counting error rate. The stream positions stay out of the response — the client
// cannot act on them, and the span already carries them for diagnosis.
@Catch(ConcurrencyError)
export class ConcurrencyErrorFilter implements ExceptionFilter {
  catch(error: ConcurrencyError, host: ArgumentsHost): void {
    host.switchToHttp().getResponse<Response>().status(HttpStatus.CONFLICT).json({
      statusCode: HttpStatus.CONFLICT,
      message: `${error.name} - the record changed while this request was in flight`,
    });
  }
}
