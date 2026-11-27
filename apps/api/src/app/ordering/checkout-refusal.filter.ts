import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { BasketOverCapError, BasketRefusedError, MerchantCannotTakePaymentsError } from '@market-miam/ordering';

type CheckoutRefusal = BasketRefusedError | BasketOverCapError | MerchantCannotTakePaymentsError;

@Catch(BasketRefusedError, BasketOverCapError, MerchantCannotTakePaymentsError)
export class CheckoutRefusalFilter implements ExceptionFilter {
  catch(refusal: CheckoutRefusal, host: ArgumentsHost): void {
    host.switchToHttp().getResponse<Response>().status(HttpStatus.CONFLICT).json({ refused: refusal.reason });
  }
}
