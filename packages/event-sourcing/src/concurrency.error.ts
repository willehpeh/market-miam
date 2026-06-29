export class ConcurrencyError extends Error {
  constructor(expectedStreamPosition: number, actualStreamPosition: number) {
    super(`Expected stream position ${expectedStreamPosition}, but stream is at ${actualStreamPosition}`);
    this.name = 'ConcurrencyError';
  }
}
