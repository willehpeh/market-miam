import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Lineage } from '@market-miam/event-sourcing';
import { OperatorRequest, VERIFIED_OPERATOR } from '@market-miam/auth-nestjs';

// Runs an operator route inside the request's lineage plus the operator's Auth0 id, so
// every event it records carries them in its metadata (ADR 0060). Goes on a class that
// OperatorAuthGuard guards.
@Injectable()
export class OperatorLineageInterceptor implements NestInterceptor {
  constructor(private readonly lineage: Lineage) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Interceptors run after guards: the class's OperatorAuthGuard has verified the operator.
    const { operatorId } = context.switchToHttp().getRequest<OperatorRequest>()[VERIFIED_OPERATOR]!;
    // LineageMiddleware opens a lineage on every route, before any guard runs.
    const request = this.lineage.current()!;
    return new Observable((subscriber) =>
      this.lineage.run({ ...request, operatorId }, () => next.handle().subscribe(subscriber)),
    );
  }
}
