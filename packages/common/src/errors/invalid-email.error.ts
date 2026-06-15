export class InvalidEmailError extends Error {
  constructor(message = 'Invalid email error') {
    super(message);
    this.name = 'InvalidEmailError';
  }
}