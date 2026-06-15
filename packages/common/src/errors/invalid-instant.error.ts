export class InvalidInstantError extends Error {
  constructor(message = 'Invalid instant error') {
    super(message);
    this.name = 'InvalidInstantError';
  }
}
