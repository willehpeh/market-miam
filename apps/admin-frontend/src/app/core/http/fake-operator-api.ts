import { HttpStatusCode } from '@angular/common/http';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';

// The api's refusals the specs answer with so far, with the texts the api sends them with.
const REFUSALS = {
  [HttpStatusCode.Unauthorized]: 'Unauthorized',
  [HttpStatusCode.Forbidden]: 'Forbidden',
} as const;

type Refusal = keyof typeof REFUSALS;

// A body as HttpTestingController can answer with one.
type Body = Parameters<TestRequest['flush']>[0];

// The operator API as a feature spec answers for it, over HttpTestingController (ADR 0064).
export class FakeOperatorApi {
  constructor(private readonly http: HttpTestingController) {}

  accounts(): ExpectedRequest {
    return this.expect('/api/ops/accounts');
  }

  invitation(): ExpectedRequest {
    return this.expect('/api/ops/vendors');
  }

  erasureOf(vendorId: string): ExpectedRequest {
    return this.expect(`/api/ops/vendors/${vendorId}/erasure`);
  }

  // Nothing was sent that a spec did not answer.
  verify(): void {
    this.http.verify();
  }

  private expect(path: string): ExpectedRequest {
    return new ExpectedRequest(this.http.expectOne((request) => request.url.endsWith(path)));
  }
}

// A request the feature sent, answered as the api would.
export class ExpectedRequest {
  constructor(private readonly request: TestRequest) {}

  get method(): string {
    return this.request.request.method;
  }

  answer(body: Body): void {
    this.request.flush(body);
  }

  accept(body: Body = null): void {
    this.request.flush(body, { status: HttpStatusCode.Accepted, statusText: 'Accepted' });
  }

  refuse(status: Refusal): void {
    this.request.flush({ statusCode: status }, { status, statusText: REFUSALS[status] });
  }

  fail(): void {
    this.request.flush(null, { status: HttpStatusCode.InternalServerError, statusText: 'Internal Server Error' });
  }
}
