export class EmptyValueError extends Error {
  constructor(message = 'Value cannot be empty') {
    super(message);
    this.name = 'EmptyValueError';
  }
}
