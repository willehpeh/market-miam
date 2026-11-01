// A genuine token for the operator API, held by someone without the `operate`
// permission: authenticated but not allowed, where an invalid token is not authenticated.
export class NotAnOperatorError extends Error {
  constructor(message = 'Not an operator') {
    super(message);
    this.name = 'NotAnOperatorError';
  }
}
