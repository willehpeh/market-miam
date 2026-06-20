import { Injectable } from '@angular/core';

export abstract class Errors {
  abstract raise(error: Error): void;
}

@Injectable()
export class FakeErrors {

  raisedErrors: Error[] = [];

  raise(error: Error) {
    this.raisedErrors.push(error);
  }
}
