import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { StorefrontNotPublishedError } from '@market-miam/ordering';

@Catch(StorefrontNotPublishedError)
export class NoStorefrontFilter implements ExceptionFilter {
  catch(_: StorefrontNotPublishedError, host: ArgumentsHost): void {
    host.switchToHttp().getResponse<Response>().status(HttpStatus.NOT_FOUND).json({ statusCode: HttpStatus.NOT_FOUND, message: 'Not Found' });
  }
}
