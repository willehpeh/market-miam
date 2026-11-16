export abstract class DomainError extends Error {
  abstract override readonly name: string;
}
